import { Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/user.model";
import SecurityCompany from "../models/security-company.model";


import CustomRequest from "../utils/types/express";
import { ResetPasswordDto } from "../utils/types/user";

const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;
    console.log("🔍 Login attempt:", email, password);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found.");
      return res.status(401).json({ status: "ERROR", message: "Invalid credentials." });
    }

    console.log("🔐 Stored hash:", user.passwordHash);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log("✅ Password match result:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ status: "ERROR", message: "Invalid credentials." });
    }

    // 🛡️ Check company verification if user is MG
    if (user.role === "MG") {
      const company = await SecurityCompany.findById(user.profile);

      if (!company) {
        return res.status(404).json({
          status: "ERROR",
          message: "Security company not found.",
        });
      }

      if (company.verificationStatus !== "verified") {
        return res.status(403).json({
          status: "ERROR",
          message: "Your company is not yet verified by the admin.",
        });
      }
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


const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.isDeleted) {
      res.status(404).json({ status: "ERROR", message: "User not found." });
      return;
    }

    const resetToken = Math.random().toString(36).substring(2);
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // In production, send resetToken via email
    res.status(200).json({
      status: "OK",
      message: "Reset token generated.",
      resetToken, // remove in production
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ status: "ERROR", message: "Internal server error." });
  }
};

const resetWithToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, token, newPassword } = req.body;

    const user = await User.findOne({ email, resetToken: token });

    if (
      !user ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry < new Date()
    ) {
      res.status(400).json({ status: "ERROR", message: "Invalid or expired token." });
      return;
    }

    user.passwordHash = newPassword; // rely on pre-save hook

    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ status: "OK", message: "Password reset successful." });
  } catch (error) {
    console.error("Reset with token error:", error);
    res.status(500).json({ status: "ERROR", message: "Internal server error." });
  }
};




export default {
  login,
  forgotPassword,
  resetWithToken,
};
