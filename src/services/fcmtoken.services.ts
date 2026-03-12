import { Response } from "express";
import { validationResult } from "express-validator";

import FcmToken from "../models/fcmToken.model";
import CustomRequest from "../utils/types/express";

export const upsertFcmToken = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(400).json({
        status: "ERROR",
        message: "User validation failed, please try again",
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fcmToken } = req.body;

    // Remove any existing doc with this token (could belong to a different userId)
    await FcmToken.deleteOne({ fcmToken });

    await FcmToken.findOneAndUpdate(
      { userId },
      { fcmToken, role },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: "OK",
      message: "Token upserted successfully",
    });
  } catch (error) {
    console.error("Error upserting FCM token:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
};

export const deleteFcmToken = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(400)
        .json({
          status: "ERROR",
          message: "User validation failed, please try again",
        });
    }

    const result = await FcmToken.findOneAndDelete({
      userId,
    });

    if (!result) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Token not found." });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Token deleted successfully" });
  } catch (error) {
    console.error("Error deleting FCM token:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
};

export default {
  upsertFcmToken,
  deleteFcmToken,
};
