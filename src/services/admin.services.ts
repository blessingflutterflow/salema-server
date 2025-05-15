import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";

import User from "../models/user.model";
import { AdminDto } from "../utils/types/user";

const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { userName, email, password }: AdminDto = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "ERROR",
        message: "User already exists with this email.",
      });
    }

    const newUser = new User({
      userName,
      userId:
        userName.toLowerCase().slice(0, 4) +
        Math.floor(1000 + Math.random() * 9000),
      email,
      passwordHash: password,
      role: "AD",
      permissions: "01",
      isActive: true,
      isDeleted: false,
    });

    await newUser.save();

    const jwtSecret = process.env.JWT_SECRET ?? "JWT_SECRET";
    const access_token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        permission: newUser.permissions,
      },
      jwtSecret,
      {
        expiresIn: "24h",
      }
    );

    res.status(201).json({
      status: "OK",
      message: "Admin registered successfully.",
      access_token,
    });
  } catch (error) {
    console.error("Error registering admin:", error);
    res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

export default {
  register,
};
