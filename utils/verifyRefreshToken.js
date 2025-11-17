import jwt from "jsonwebtoken";
import UserRefreshTokenModel from "../models/UserRefreshToken.js";

const verifyRefreshToken = async (refreshToken) => {
  try {
    const privateKey = process.env.JWT_REFRESH_TOKEN_SECRET_KEY;

    // Decode and verify the refresh token in one step
    const decodedToken = jwt.verify(refreshToken, privateKey);
    const userIdFromToken = decodedToken._id;

    //Find refresh token
    const userRefreshToken = await UserRefreshTokenModel.findOne({
      token: refreshToken,
      userId: userIdFromToken, // Ensure the token belongs to this specific user
    });

    // Return error if refresh token is not found
    if (!userRefreshToken) {
      return { error: true };
    }

    //Return token details
    return {
      user: decodedToken,
      error: false,
    };
  } catch (error) {
    return { error: true, message: "Failed to verify refresh token" };
  }
};

export default verifyRefreshToken;
