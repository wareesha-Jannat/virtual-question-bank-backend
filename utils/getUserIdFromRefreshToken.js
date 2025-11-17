import jwt from "jsonwebtoken";

const getUserIdFromRefreshToken = (refreshToken) => {
  if (!refreshToken) {
    return null; // Return null if no token is provided
  }

  try {
    // Decode the refresh token without verifying its signature
    const decodedToken = jwt.decode(refreshToken);
    return decodedToken?._id || null; // Extract and return the `_id` field from the payload
  } catch (error) {
    return null; // Return null in case of an error
  }
};

export default getUserIdFromRefreshToken;
