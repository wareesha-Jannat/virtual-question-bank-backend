import jwt from "jsonwebtoken"; // jwt library for decoding tokens

const isTokenExpire = (token) => {
  if (!token) {
    return true;  // If no token is provided, treat it as expired
  }
  const decodedToken = jwt.decode(token);
  const currentTime = Date.now() / 1000;  //to covert date(in milliseconds) into seconds
  return decodedToken.exp < currentTime;
};
export default isTokenExpire;
