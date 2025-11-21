import User from "../models/User.js";
import bcrypt from "bcrypt";
import generateTokens from "../utils/generateTokens.js";
import Question from "../models/Question.js";
import setTokensCookies from "../utils/setTokensCookies.js";
import UserRefreshTokenModel from "../models/UserRefreshToken.js";
import { sendNotification } from "../utils/sendNotification.js";
import SupportRequest from "../models/SupportRequest.js";
import Activity from "../models/Activity.js";
import jwt from "jsonwebtoken";
import transporter from "../config/emailConfig.js";
import validator from "validator";

class UserController {
  // User Registration
  static userRegistration = async (req, res) => {
    try {
      //request body parameters
      const { name, email, password, passwordConfirmation } = req.body;

      //check required fields
      if (!name || !email || !password || !passwordConfirmation) {
        return res.status(400).json({
          success: false,
          message: "All required fields must be filled",
        });
      }
      //Check  password and confirm password values
      if (password !== passwordConfirmation) {
        return res.status(400).json({
          success: false,
          message: "Password and confirm password must be same",
        });
      }
      //check if user already exist
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists with this email",
        });
      }
      //Generate Salt and Hash Password
      const salt = await bcrypt.genSalt(Number(process.env.SALT));
      const hashedPassword = await bcrypt.hash(password, salt);

      //Create new user
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
      });
      const newcomer = await newUser.save();

      const title = "Complete Your Profile!";
      const message =
        "Welcome aboard! Please take a moment to complete your profile.";

      // calling send  Notification to send Notification
      await sendNotification({ title, message, userId: newcomer._id });

      // Create an activity log for the user registration
      const activity = new Activity({
        user: newcomer._id, // Link the activity to the new user
        role: newcomer.role,
        action: "User Registratered",
      });

      // Save the activity to the database
      await activity.save();

      res.status(201).json({
        success: true,
        message: "User Registered Successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal server error , please try again ",
      });
    }
  };

  //User Login

  static userLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
      //check required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Required fields must be filled",
        });
      }
      //Check user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      //updating last Login field
      user.lastLogin = new Date();
      user.isActive = true; // Set isActive to true on login
      await user.save();

      //Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      //Generate tokens
      const { accessToken, refreshToken, accessTokenExp, refreshTokenExp } =
        await generateTokens(user);
      const role = user.role;

      //set Cookies
      setTokensCookies(
        res,
        accessToken,
        refreshToken,
        accessTokenExp,
        refreshTokenExp,
        role
      );

      // Create an activity log for the user registration
      const activity = new Activity({
        user: user._id, // Link the activity to the new user
        role: user.role,
        action: "User Logged in",
      });

      // Save the activity to the database
      await activity.save();

      //Sending response
      res.status(200).json({
        user: { role: user.role },
        success: true,
        message: "Login Successfull",
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal server error , unable to login please try again ",
      });
    }
  };

  //Change Password
  static changePassword = async (req, res) => {
    try {
      const { oldPassword, newPassword, passwordConfirmation } = req.body;

      //Check required fields
      if (!oldPassword || !newPassword || !passwordConfirmation) {
        return res.status(400).json({
          success: false,
          message: "required fields must be filled",
        });
      }

      //find user
      const user = await User.findById(req.user._id);

      //Check password
      const isMatch = await bcrypt.compare(oldPassword, user.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect Old Password",
        });
      }

      //Check  oldPassword and new passowrd  values
      if (oldPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from old password",
        });
      }

      //Check  password and confirm password values
      if (newPassword !== passwordConfirmation) {
        return res.status(400).json({
          success: false,
          message: "Password and confirm password must be same",
        });
      }

      //Generate salt and hash password
      const salt = await bcrypt.genSalt(Number(process.env.SALT));
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      //Update user password
      await User.findByIdAndUpdate(user._id, {
        $set: {
          password: hashedPassword,
        },
      });

      const activity = new Activity({
        user: user, // Link the activity to the new user
        role: user.role,
        action: "User Changed password",
      });

      // Save the activity to the database
      await activity.save();

      res.status(200).json({
        success: false,
        message: "Password changed successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error , try again later",
      });
    }
  };

  //Profile or Logged-in user
  static userProfile = async (req, res) => {
    res.json({ user: req.user });
  };
  //user role
  static userRole = async (req, res) => {
    res.json({ role: req.user.role });
  };

  //Send Password reset link via email
  static sendResetPassword = async (req, res) => {
    try {
      const { email } = req.body;
      //Checks if email provided
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      //find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No registered user from this email",
        });
      }

      //Generate token for password reset
      const secret = user._id + process.env.JWT_ACCESS_TOKEN_SECRET_KEY;
      const token = jwt.sign({ userID: user._id }, secret, {
        expiresIn: "15m",
      });

      //Reset link
      const resetLink = `${process.env.FRONTEND_HOST}/account/reset-password-confirm/${user._id}/${token}`;
      //Send password reset email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Password Reset Link",
        html: `<p>Hello ${user.name},</p><p>Please  <a href="${resetLink}">click here </a> to reset your password.</p>`,
      });
      res.status(200).json({
        success: true,
        message: "Password reset email sent. Please check your email",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Internal server error unable to send reset password link , try again later",
      });
    }
  };

  //Password reset

  static passwordReset = async (req, res) => {
    try {
      const { password, passwordConfirmation } = req.body;
      const { id, token } = req.params;
      //find user by email
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      //Validate  token
      const new_secret = user._id + process.env.JWT_ACCESS_TOKEN_SECRET_KEY;
      jwt.verify(token, new_secret);

      //check if password and password confirmation are provided
      if (!password || !passwordConfirmation) {
        return res.status(400).json({
          success: false,
          message: "New Password and confirm new password are required",
        });
      }
      //Check  password and confirm password values
      if (password !== passwordConfirmation) {
        return res.status(400).json({
          success: false,
          message: "Password and confirm password must be same",
        });
      }

      //Generate salt and hash password
      const salt = await bcrypt.genSalt(Number(process.env.SALT));
      const newHashedPassword = await bcrypt.hash(password, salt);

      //Update user password
      await User.findByIdAndUpdate(user._id, {
        $set: {
          password: newHashedPassword,
        },
      });

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          message: "Token Expired. Please request a new password reset link",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Internal server error , unable to reset password try again",
      });
    }
  };

  //Logout
  static userLogout = async (req, res) => {
    try {
      const userId = req.user._id; // may be undefined

      await UserRefreshTokenModel.findOneAndDelete({ userId });
      const activity = new Activity({
        user: userId,
        role: req.user.role,
        action: "User Logged out",
      });
      await activity.save();

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Unable to logout" });
    }
  };

  //Add new User

  static addUser = async (req, res) => {
    try {
      const { name, email, role } = req.body;

      //checking required fields
      if (!name || !email || !role) {
        return res.status(400).json({
          success: false,
          message: "Required fields must be filled",
        });
      }
      if (
        !validator.isEmail(email) ||
        email.toLowerCase().includes("example.com")
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      //check if user already exist
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists with this email",
        });
      }

      const newUser = new User({
        name,
        email,
        role,
      });
      const newcomer = await newUser.save();

      //Send Notification
      const title = "Complete Your Profile!";
      const message =
        "Welcome aboard! Please take a moment to complete your profile.";
      await sendNotification({ title, message, userId: newcomer._id });

      // Generate token for password reset
      const secret = newUser._id + process.env.JWT_ACCESS_TOKEN_SECRET_KEY;
      const token = jwt.sign({ userID: newUser._id }, secret, {
        expiresIn: "15m",
      });

      // Generate reset link
      const resetLink = `${process.env.FRONTEND_HOST}/account/reset-password-confirm/${newUser._id}/${token}`;

      // Send password reset email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: newUser.email,
        subject: "Password set Link",
        html: `
                <p>Hello ${newUser.name},</p>
                <p>Please <a href="${resetLink}">click here</a> to set your password.</p>
                <p>This link is valid for 15 minutes.</p>
                <p>You can get this link by using forget password in case of problem. </p>
            `,
      });

      const activity = new Activity({
        user: req.user._id, // Link the activity to the new user
        role: req.user.role,
        action: "User added new User",
      });

      // Save the activity to the database
      await activity.save();

      // Respond with success message
      res.status(201).json({
        success: true,
        message: "User created successfully and password reset email sent.",
        newUser: newcomer,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error, please try again later.",
      });
    }
  };

  //Get users

  static getUsers = async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "", role = "" } = req.query;

      const numericLimit = parseInt(limit);
      const skip = (page - 1) * numericLimit;

      const query = {
        ...(search && { name: { $regex: search, $options: "i" } }),
        ...(role && { role }),
      };

      const users = await User.find(query)
        .select("-password ")
        .skip(skip)
        .limit(numericLimit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      res.status(200).json({
        totalPages: Math.ceil(total / numericLimit),
        currentPage: Number(page),
        users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error, cannot get users",
      });
    }
  };

  //Update User

  static updateUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, email, role } = req.body;

      //checking required fields
      if (!name || !email || !role) {
        return res.status(400).json({
          success: false,
          message: "Required fields must be filled",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, email, role },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const activity = new Activity({
        user: req.user._id, // Link the activity to the new user
        role: req.user.role,
        action: "User updated a user",
      });

      // Save the activity to the database
      await activity.save();
      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        updatedUser,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  //Update User Personal Info

  static updatePersonalInfo = async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, email, age, gender } = req.body;

      //checking required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: "Required fields must be filled",
        });
      }

      const updatedInfo = await User.findByIdAndUpdate(
        userId,
        { name, email, age, gender },
        { new: true, runValidators: true, select: "-password" }
      );
      const title = "Profile updated";
      const message = "Your profile has updated successfully";
      await sendNotification({ title, message, userId });

      const activity = new Activity({
        user: req.user._id, // Link the activity to the new user
        role: req.user.role,
        action: "User updated personal information",
      });

      // Save the activity to the database
      await activity.save();
      return res.status(200).json({
        success: true,
        message: "Personal Info updated successfully",
        updatedInfo,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  //Delete Account
  static deleteAccount = async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update all questions created by the user
      await Question.updateMany(
        { createdBy: userId },
        { $set: { createdBy: null } }
      );

      await User.deleteOne({ _id: userId });

      //Deleting  support requests
      await SupportRequest.deleteMany({ userId });

      //Delete user refresh token from database
      await UserRefreshTokenModel.findOneAndDelete({ userId });

      // Clear access token and refresh cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User deleted his account",
      });

      // Save the activity to the database
      await activity.save();
      return res.status(200).json({
        message: "Account deleted successfully",
        success: true,
        userId,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  //Delete User
  static deleteUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update all questions created by the user
      await Question.updateMany(
        { createdBy: userId },
        { $set: { createdBy: null } }
      );

      await User.deleteOne({ _id: userId });

      //Deleting  support requests
      await SupportRequest.deleteMany({ userId: userId });

      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "Admin deleted a user",
      });

      // Save the activity to the database
      await activity.save();
      return res.status(200).json({
        message: "User deleted successfully",
        success: true,
        userId,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

export default UserController;
