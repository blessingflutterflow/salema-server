import { Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import CustomRequest from "../utils/types/express";
import { IDangerZone } from "../utils/types/danger-zone";
import DangerZone from "../models/danger-zones.model";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import * as geolib from "geolib";

// ---- Type helpers ----
type AuthedHandler = (req: CustomRequest, res: Response, next: NextFunction) => Promise<void>;

type CircleNarrow = IDangerZone & {
  type: "Circle";
  center: { type: "Point"; coordinates: [number, number] };
  radius: number;
};
function isValidCircle(z: IDangerZone): z is CircleNarrow {
  return (
    z.type === "Circle" &&
    !!z.center &&
    Array.isArray(z.center.coordinates) &&
    z.center.coordinates.length === 2 &&
    typeof z.radius === "number" &&
    z.radius > 0
  );
}

// ---- Handlers ----
const create: AuthedHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ status: "ERROR", errors: errors.array() });
      return;
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

    res.status(201).json({ status: "OK", message: "Danger zone created successfully" });
  } catch (error) {
    console.error("Error creating danger zone:", error);
    res.status(500).json({ status: "ERROR", message: "Failed to create danger zone" });
  }
};

const remove: AuthedHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ status: "ERROR", errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const dangerZone = await DangerZone.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!dangerZone) {
      res.status(404).json({ status: "ERROR", message: "Danger zone not found!" });
      return;
    }

    res.status(200).json({ status: "OK", message: "Danger zone deleted successfully" });
  } catch (error) {
    console.error("Error deleting danger zone:", error);
    res.status(500).json({ status: "ERROR", message: "Failed to delete danger zone" });
  }
};

const list: AuthedHandler = async (_req, res) => {
  try {
    const dangerZones = await DangerZone.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.status(200).json({ status: "OK", dangerZones });
  } catch (error) {
    console.error("Error on listing danger zones:", error);
    res.status(500).json({ status: "ERROR", message: "Failed to list danger zones" });
  }
};

const check: AuthedHandler = async (req, res) => {
  try {
    const { location, fcmToken } = req.body as {
      location?: { latitude?: number; longitude?: number };
      fcmToken?: string;
    };

    if (
      !location ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) {
      res.status(400).json({ status: "ERROR", message: "Invalid location format" });
      return;
    }

    const { latitude: lat, longitude: lng } = location;
    const point = { type: "Point", coordinates: [lng, lat] as [number, number] };

    // 1) Polygons
    const polyZones = await DangerZone.find({
      isDeleted: false,
      type: "Polygon",
      location: { $geoIntersects: { $geometry: point } },
    }).limit(1);

    // 2) Circles: prefilter then precise
    const nearbyCircles = await DangerZone.find({
      isDeleted: false,
      type: "Circle",
      center: {
        $near: { $geometry: point, $maxDistance: 2000 },
      },
    }).limit(20);

    let matched: IDangerZone | null = polyZones[0] ?? null;

    if (!matched) {
      for (const z of nearbyCircles) {
        if (!isValidCircle(z)) continue;
        const [clng, clat] = z.center.coordinates; // [lng, lat]
        const d = geolib.getDistance(
          { latitude: lat, longitude: lng },
          { latitude: clat, longitude: clng }
        );
        if (d <= z.radius) {
          matched = z;
          break;
        }
      }
    }

    if (matched) {
      res.status(200).json({
        status: "OK",
        message: `You are within - ${matched.name}`,
        zone: { id: matched._id, name: matched.name },
      });

      // fire-and-forget
      (async () => {
        const tokens = fcmToken
          ? [fcmToken]
          : (await FcmToken.find({ userId: req.user?.id }, "fcmToken")).map(t => t.fcmToken);
        if (tokens.length) {
          await sendNotification(
            tokens,
            "Danger Zone Alert",
            `Safety Alert: You’ve entered a dangerous area — ${matched!.name}`
          );
        }
      })().catch(e => console.error("post-send error", e));

      return;
    }

    res.status(200).json({ status: "OK", message: "You are not near any danger zone" });
  } catch (error) {
    console.error("Error checking danger zone:", error);
    res.status(500).json({ status: "ERROR", message: "Failed to check danger zone" });
  }
};

export default { create, remove, list, check };
