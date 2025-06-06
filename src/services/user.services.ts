import { Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/user.model";
import CustomRequest from "../utils/types/express";
import { ResetPasswordDto } from "../utils/types/user";

const login = async (req: Request, res: Response): Promise<any> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "ERROR", errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ status: "ERROR", message: "Invalid credentials." });
    }

    const jwtSecret = process.env.JWT_SECRET ?? "JWT_SECRET";
    const access_token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        permission: user.permissions,
      },
      jwtSecret,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      status: "OK",
      message: "Login successful",
      role: user.role,
      access_token,
      userName: user.userName,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ status: "ERROR", message: "Internal server error." });
  }
};

const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ status: "ERROR", errors: errors.array() });
    return;
  }

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ status: "ERROR", message: "User not found." });
      return;
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // TODO: Send `resetToken` via email or SMS to the user
    res.status(200).json({ status: "OK", message: "Reset token generated.", resetToken });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ status: "ERROR", message: "Internal server error." });
  }
};

const setNewPassword = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ status: "ERROR", errors: errors.array() });
    return;
  }

  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ status: "ERROR", message: "Invalid or expired token." });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ status: "OK", message: "Password has been reset." });
  } catch (error) {
    console.error("Set new password error:", error);
    res.status(500).json({ status: "ERROR", message: "Internal server error." });
  }
};

const resetPassword = async (req: CustomRequest, res: Response): Promise<any> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "ERROR", errors: errors.array() });
  }

  try {
    const { oldPassword, newPassword }: ResetPasswordDto = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ status: "ERROR", message: "Unauthorized: User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ status: "ERROR", message: "Old password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ status: "OK", message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ status: "ERROR", message: "Internal server error." });
  }
};

export default {
  login,
  forgotPassword,
  setNewPassword,
  resetPassword,
};
