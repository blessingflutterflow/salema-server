import { Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/user.model";
import CustomRequest from "../utils/types/express";
import { ResetPasswordDto } from "../utils/types/user";

const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Invalid credentials." });
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
      {
        expiresIn: "24h",
      }
    );

    return res.status(200).json({
      status: "OK",
      message: "Login successful",
      role: user.role,
      access_token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

const resetPassword = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }
    const { oldPassword, newPassword }: ResetPasswordDto = req.body;
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Unauthorized: User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Old password is incorrect." });
    }

    user.passwordHash = newPassword;
    await user.save();

    return res
      .status(200)
      .json({ status: "OK", message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

export default {
  login,
  resetPassword,
};
