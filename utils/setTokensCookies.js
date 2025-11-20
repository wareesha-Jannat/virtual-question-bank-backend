const setTokensCookies = (
  res,
  accessToken,
  refreshToken,
  newAccessTokenExp,
  newRefreshTokenExp
) => {
  // Calculate the max age for the access and refresh token cookie (in milliseconds)
  const accessTokenMaxAge =
    (newAccessTokenExp - Math.floor(Date.now() / 1000)) * 1000;
  const refreshTokenMaxAge =
    (newRefreshTokenExp - Math.floor(Date.now() / 1000)) * 1000;
  const isProduction = process.env.NODE_ENV === "production";

  //set Cookie for Access Token
  res.cookie("accessToken", accessToken, {
    httpOnly: true,

    secure: isProduction, // true in prod (HTTPS), false in local dev
    sameSite: isProduction ? "none" : "lax", // required for cross-site cookies (frontend on different domain)
    maxAge: accessTokenMaxAge,
    path: "/",
  });

  //set Cookie for refresh Token
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction, // true in prod (HTTPS), false in local dev
    sameSite: isProduction ? "none" : "lax",
    maxAge: refreshTokenMaxAge,
    path: "/",
  });
};

export default setTokensCookies;
