import { Response } from "express";
import { validationResult } from "express-validator";

import CustomRequest from "../utils/types/express";
import { IDangerZone } from "../utils/types/danger-zone";
import DangerZone from "../models/danger-zones.model";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";

const create = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { name, type, location, center, radius } = req.body;

    const dangerZone: IDangerZone = new DangerZone({
      name,
      type,
      location: type === "Polygon" ? location : undefined,
      center: type === "Circle" ? center : undefined,
      radius: type === "Circle" ? radius : undefined,
      createdBy: req.user?.id,
    });

    await dangerZone.save();
    res.status(201).json({
      status: "OK",
      message: "Danger zone created successfully",
    });
  } catch (error) {
    console.error("Error creating danger zone:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to create danger zone",
    });
  }
};

const remove = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id } = req.params;

    const dangerZone = await DangerZone.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!dangerZone) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Danger zone not found!" });
    }

    res.status(200).json({
      status: "OK",
      message: "Danger zone deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting danger zone:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to delete danger zone",
    });
  }
};

const list = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const dangerZones = await DangerZone.find({ isDeleted: false }).sort({
      timestamp: -1,
    });

    return res.status(200).json({ status: "OK", dangerZones });
  } catch (error) {
    console.error("Error on listing danger zones:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to list danger zones",
    });
  }
};

const check = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { location } = req.body;

    const userLocation = [location.latitude, location.longitude];

    const polygonZone = await DangerZone.findOne({
      location: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: userLocation,
          },
        },
      },
      isDeleted: false,
    });

    if (polygonZone) {
      const fcmTokens = await FcmToken.find({ userId: req.user?.id });

      const tokens = fcmTokens.map((tokenDoc) => tokenDoc.fcmToken);

      await sendNotification(
        tokens,
        "Danger Zone Alert!",
        `You're in a danger zone ${
          polygonZone.name && `- ${polygonZone.name}`
        }, please take care!`
      );

      return res.status(200).json({
        status: "OK",
        message: `Location is within a danger zone - ${polygonZone.name}`,
      });
    }

    const circleZone = await DangerZone.findOne({
      type: "Circle",
      center: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: userLocation,
          },
          $maxDistance: 5000,
        },
      },
      isDeleted: false,
    });

    if (circleZone) {
      const fcmTokens = await FcmToken.find({ userId: req.user?.id });

      const tokens = fcmTokens.map((tokenDoc) => tokenDoc.fcmToken);

      await sendNotification(
        tokens,
        "Danger Zone Alert!",
        `You're in a danger zone ${
          circleZone.name && `- ${circleZone.name}`
        }, please take care!`
      );

      return res.status(200).json({
        status: "OK",
        message: `Location is within a danger zone - ${circleZone.name}`,
      });
    }

    res.status(200).json({
      status: "OK",
      message: "Location is not within any danger zone",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      status: "ERROR",
      message: "Server error while checking danger zone",
    });
  }
};

export default {
  create,
  remove,
  list,
  check,
};
