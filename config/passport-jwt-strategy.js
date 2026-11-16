import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt"; // Importing passport-jwt strategy for handling authentication.
import passport from "passport"; // Importing passport to handle authentication

// Configuration options for the JwtStrategy
let opts = {
  // Extract the JWT from the 'Authorization' header as a Bearer token
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_ACCESS_TOKEN_SECRET_KEY, // Secret key to verify the JWT.
};

// Using the JwtStrategy to authenticate users based on the JWT token

passport.use(
  new JwtStrategy(opts, async function (jwt_payload, done) {
    console.log(jwt_payload._id, jwt_payload.role);
    return done(null, {
      _id: jwt_payload._id,
      role: jwt_payload.role,
    }); // If the user is found, return the user object
  }),
);
//done means i am done working here wheather it is a success or failure
