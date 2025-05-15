import mongoose, { Schema } from "mongoose";

import { IFcmToken } from "../utils/types/fcm";

const fcmTokenSchema = new Schema<IFcmToken>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      unique: true,
    },
    fcmToken: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["AD", "GU", "MG", "SO"],
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const FcmToken = mongoose.model<IFcmToken>("FcmToken", fcmTokenSchema);

export default FcmToken;
