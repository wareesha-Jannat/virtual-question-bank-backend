import jwt from 'jsonwebtoken'
import UserRefreshTokenModel from '../models/UserRefreshToken.js';

const generateTokens = async(user) => {
  try {
    const payload = { _id: user._id, role: user.role};

    //Generate access token with expiration time
    const accessTokenExp = Math.floor(Date.now() / 1000) + 120; //set expiration time to 120 seconds
    const accessToken = jwt.sign(
        {...payload, exp: accessTokenExp},
        process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
    );

   //Generate refresh token 
    const refreshTokenExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1; //set expiration time to 1 day
    const refreshToken = jwt.sign(
        {...payload, exp: refreshTokenExp},
        process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
    );

     // Update the existing refresh token in the database
   await UserRefreshTokenModel.findOneAndUpdate(
      { userId : user._id },
      { token: refreshToken },
      { upsert: true} // If no entry exists, create one
  );
 
  // Return the generated tokens and their expiration times
    return {accessToken, refreshToken, accessTokenExp, refreshTokenExp}
  } catch (error) {
    throw error;
  }
}
export default generateTokens
