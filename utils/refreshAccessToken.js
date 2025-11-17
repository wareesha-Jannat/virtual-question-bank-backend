import generateTokens from "./generateTokens.js";
import verifyRefreshToken from "./verifyRefreshToken.js";

const refreshAccessToken = async (oldRefreshToken) => {
  try {
    // Verify refresh token
    const { user, error } = await verifyRefreshToken(oldRefreshToken);
    if (error) {
      return null;
    }

    // Generate new tokens
    const { accessToken, refreshToken, accessTokenExp, refreshTokenExp } =
      await generateTokens(user);

    // Return the new tokens and their expiration times
    return {
      newAccessToken: accessToken,
      newRefreshToken: refreshToken,
      newAccessTokenExp: accessTokenExp,
      newRefreshTokenExp: refreshTokenExp,
    };
  } catch (error) {
    throw error;
  }
};
export default refreshAccessToken;
