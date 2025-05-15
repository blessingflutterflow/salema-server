import mongoose, { Document } from "mongoose";

export interface IFcmToken extends Document {
  userId: mongoose.Types.ObjectId;
  fcmToken: string;
  role: "AD" | "MG" | "SO" | "GU";
}
