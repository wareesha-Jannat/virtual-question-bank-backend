import refreshAccessToken from "../utils/refreshAccessToken.js";
import isTokenExpire from "../utils/isTokenExpire.js";
import setTokensCookies from "../utils/setTokensCookies.js";
import getUserIdFromRefreshToken from "../utils/getUserIdFromRefreshToken.js";

const refreshState = new Map(); // { userId: { isRefreshing: boolean, refreshPromise: Promise } }
const globalTokens = new Map(); // { userId: { accessToken, refreshToken } }
// Middleware to automatically refresh the access token if it is expired.

function unauthorizedResponse(res) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.status(401).json({
    error: "UNAUTHORIZED",
    message: "Session expired or invalid. Please login again.",
  });
}

const accessTokenAutoRefresh = async (req, res, next) => {
  try {
    // Retrieve tokens from cookies
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    // Check if an access token exists and isn't expired
    if (accessToken && !isTokenExpire(accessToken)) {
      req.headers["authorization"] = `Bearer ${accessToken}`;
      return next(); // Access token is valid, move to the next middleware
    }

    //Check if the refresh token exists
    if (!refreshToken) {
      return unauthorizedResponse(res);
    }

    // Decode userId from the refresh token
    const userId = getUserIdFromRefreshToken(refreshToken);
    if (!userId) {
      return unauthorizedResponse(res);
    }

    // Use the cached tokens if available and valid
    const cachedTokens = globalTokens.get(userId);
    if (cachedTokens && !isTokenExpire(cachedTokens.accessToken)) {
      // Use cached tokens for the request
      setTokensCookies(
        res,
        cachedTokens.accessToken,
        cachedTokens.refreshToken,
        cachedTokens.accessTokenExp,
        cachedTokens.refreshTokenExp
      );
      req.headers["authorization"] = `Bearer ${cachedTokens.accessToken}`;
      return next();
    }
    // Retrieve or initialize the refresh state for this user
    if (!refreshState.has(userId)) {
      refreshState.set(userId, { isRefreshing: false, refreshPromise: null });
    }
    const state = refreshState.get(userId);

    // If a refresh is already in progress for this user, wait for it to complete
    if (state.isRefreshing && state.refreshPromise) {
      try {
        const newTokens = await state.refreshPromise;

        // Use the new tokens to update the cookies for the waiting request
        setTokensCookies(
          res,
          newTokens.newAccessToken,
          newTokens.newRefreshToken,
          newTokens.newAccessTokenExp,
          newTokens.newRefreshTokenExp
        );

        // Add the new access token to the authorization header
        req.headers["authorization"] = `Bearer ${newTokens.newAccessToken}`;

        return next();
      } catch (error) {
        return unauthorizedResponse(res);
      }
    }

    // If no refresh is in progress, initiate the refresh process
    state.isRefreshing = true;
    state.refreshPromise = refreshAccessToken(refreshToken); // Initiate token refresh

    try {
      const refreshResponse = await state.refreshPromise;

      if (!refreshResponse) {
        return unauthorizedResponse(res);
      }

      // Set new tokens in cookies for the current request
      setTokensCookies(
        res,
        refreshResponse.newAccessToken,
        refreshResponse.newRefreshToken,
        refreshResponse.newAccessTokenExp,
        refreshResponse.newRefreshTokenExp
      );

      // Add the new access token to the authorization header for the request
      req.headers["authorization"] = `Bearer ${refreshResponse.newAccessToken}`;
      // Cache the new tokens
      globalTokens.set(userId, {
        accessToken: refreshResponse.newAccessToken,
        refreshToken: refreshResponse.newRefreshToken,
        accessTokenExp: refreshResponse.newAccessTokenExp,
        refreshTokenExp: refreshResponse.newRefreshTokenExp,
      });

      // Reset refresh state after obtaining the new tokens
      state.isRefreshing = false;
      state.refreshPromise = null;

      return next();
    } catch (error) {
      // Reset refresh state in case of error

      refreshState.delete(userId);
      globalTokens.delete(userId);
      // Reject any waiting requests
      return unauthorizedResponse(res);
    } finally {
      state.isRefreshing = false;
      state.refreshPromise = null;
    }
  } catch (error) {
    return unauthorizedResponse(res);
  }
};

export default accessTokenAutoRefresh;
