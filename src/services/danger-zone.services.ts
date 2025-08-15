import { Response } from "express";
import { validationResult } from "express-validator";

import CustomRequest from "../utils/types/express";
import { IDangerZone } from "../utils/types/danger-zone";
import DangerZone from "../models/danger-zones.model";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import * as geolib from 'geolib';


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
    const { location } = req.body; // { latitude, longitude }
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return res.status(400).json({ status: 'ERROR', message: 'Invalid location format' });
    }

    const { latitude, longitude } = location;

    const dangerZones = await DangerZone.find({ isDeleted: false });

    for (const zone of dangerZones) {
      let isInside = false;

      if (zone.type === 'Polygon' && zone.location?.coordinates?.length) {
        const polygon = zone.location.coordinates[0].map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        }));

        isInside = geolib.isPointInPolygon({ latitude, longitude }, polygon);
      }

      if (zone.type === 'Circle' && zone.center?.coordinates?.length === 2) {
        const distance = geolib.getDistance(
          { latitude, longitude },
          {
            latitude: zone.center.coordinates[1],
            longitude: zone.center.coordinates[0],
          }
        );
        isInside = distance <= (zone.radius || 0);
      }

      if (isInside) {
        // 🔔 1. Fetch all FCM tokens to notify
        const fcmTokens = await FcmToken.find({}, "fcmToken");

        const tokenList = fcmTokens.map(t => t.fcmToken).filter(Boolean);

        // 🔔 2. Send the notification
        await sendNotification(
          tokenList,
          "Danger Zone Alert",
          `Safety Alert: You’ve entered a dangerous area —  ${zone.name}`
        );

        // 🧾 3. Respond to the user
        return res.status(200).json({
          status: 'OK',
          message: `You are within - ${zone.name}`,
        });
      }
    }

    return res.status(200).json({
      status: 'OK',
      message: 'You are not near any danger zone',
    });
  } catch (error) {
    console.error('Error checking danger zone:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Failed to check danger zone',
    });
  }
};


export default {
  create,
  remove,
  list,
  check,
};
