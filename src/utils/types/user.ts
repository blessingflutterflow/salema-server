import mongoose, { Document } from "mongoose";

import { ISecurityOfficer } from "./security-officer";
import { ISecurityCompany } from "./security-company";
import { IClient } from "./client";

export interface IUser extends Document {
  userName: string;
  userId: string;
  email: string;
  passwordHash: string;
  role: "AD" | "GU" | "MG" | "SO" | "DR";
  permissions: string;
  profile: mongoose.Types.ObjectId;
  isActive: boolean;
  remarks: string;
  isDeleted: boolean;
  resetToken?: string | null;
 resetTokenExpiry?: Date | null;

  _id: mongoose.Types.ObjectId;
}

export interface AdminDto {
  userName: string;
  email: string;
  password: string;
}

export interface ResetPasswordDto {
  oldPassword: string;
  newPassword: string;
}
