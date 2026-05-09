import express from "express";
import ServiceRequest from "../models/service-requests.model";
import SecurityCompany from "../models/security-company.model";
import User from "../models/user.model";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";
import authorizeSecurityCompany from "../middlewares/authorizeSecurityCompany";
import { publishToEscortChannel } from "../utils/helpers/ably";

const router = express.Router();
const MAPS_KEY = process.env.GOOGLE_MAPS_KEY ?? "";

// ─── Pricing constants ────────────────────────────────────────────────────────

const TIERS = [
  {
    id: "standard",
    label: "Standard",
    description: "1 armed officer, standard vehicle",
    vehicles: 1,
    armed: true,
    basePrice: 35,
    kmRate: 8,
  },
  {
    id: "premium",
    label: "Premium",
    description: "2 armed officers, premium vehicles",
    vehicles: 2,
    armed: true,
    basePrice: 50,
    kmRate: 12,
  },
  {
    id: "presidential",
    label: "Presidential",
    description: "3+ tactical officers, armoured escort",
    vehicles: 3,
    armed: true,
    basePrice: 100,
    kmRate: 18,
  },
] as const;

const AREA_SURCHARGE: Record<string, number> = {
  township: 25,
  cbd: 35,
  suburb: 15,
};

const CAR_SURCHARGE: Record<string, number> = {
  pre2019: 30,
  "2020_2024": 15,
  "2025_2026": 20,
};

function calcPrice(
  basePrice: number,
  kmRate: number,
  distanceKm: number,
  areaType: string,
  carYear: string
): number {
  const raw =
    basePrice +
    distanceKm * kmRate +
    (AREA_SURCHARGE[areaType] ?? 15) +
    (CAR_SURCHARGE[carYear] ?? 15);
  return Math.ceil(raw / 5) * 5;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── GET /ride-along/v1/estimate ──────────────────────────────────────────────

router.get("/estimate", async (req: any, res: any) => {
  const { originLat, originLng, destinationPlaceId, areaType, carYear } =
    req.query as Record<string, string>;

  if (!originLat || !originLng || !destinationPlaceId) {
    return res.status(400).json({ error: "Missing required params" });
  }

  try {
    const params = new URLSearchParams({
      origin: `${originLat},${originLng}`,
      destination: `place_id:${destinationPlaceId}`,
      key: MAPS_KEY,
      mode: "driving",
      units: "metric",
    });

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== "OK" || !data.routes?.[0]) {
      return res
        .status(422)
        .json({ error: "Could not calculate route", status: data.status });
    }

    const leg = data.routes[0].legs[0];
    const distanceM: number = leg.distance.value;
    const durationS: number = leg.duration.value;
    const polyline: string = data.routes[0].overview_polyline.points;

    const distanceKm = distanceM / 1000;
    const durationMin = Math.ceil(durationS / 60);

    const tiers = TIERS.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      vehicles: t.vehicles,
      armed: t.armed,
      price: calcPrice(t.basePrice, t.kmRate, distanceKm, areaType, carYear),
      eta: `~${durationMin + (t.vehicles > 1 ? 5 * (t.vehicles - 1) : 0)} min`,
    }));

    return res.json({
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMin,
      polyline,
      tiers,
    });
  } catch (err) {
    console.error("Estimate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /ride-along/v1/book ─────────────────────────────────────────────────
// Body: { pickupLat, pickupLng, destinationAddress, tierId, price, numVehicles, isArmed }

router.post("/book", decodeToken, authorizeClient, async (req: any, res: any) => {
  try {
    const {
      pickupLat,
      pickupLng,
      destinationAddress,
      tierId,
      price,
      numVehicles,
      isArmed,
    } = req.body;

    if (!pickupLat || !pickupLng || !destinationAddress || !tierId || !price) {
      return res.status(400).json({ status: "ERROR", message: "Missing required fields." });
    }

    const lat = parseFloat(pickupLat);
    const lng = parseFloat(pickupLng);

    // Auto-assign nearest verified security company
    const companies = await SecurityCompany.find({
      isDeleted: false,
      verificationStatus: "verified",
      isOnline: true,
      latitude: { $exists: true },
      longitude: { $exists: true },
    }).select("_id latitude longitude");

    if (companies.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "No security providers are online in your area right now. Please try again shortly.",
      });
    }

    let nearest = companies[0];
    let minDist = haversine(lat, lng, Number(nearest.latitude), Number(nearest.longitude));
    for (const c of companies) {
      const d = haversine(lat, lng, Number(c.latitude), Number(c.longitude));
      if (d < minDist) { minDist = d; nearest = c; }
    }

    const companyUser = await User.findOne({ profile: nearest._id });
    if (!companyUser) {
      return res.status(404).json({
        status: "ERROR",
        message: "Could not resolve security company user account.",
      });
    }

    // Create the service request
    const serviceRequest = new ServiceRequest({
      client: req.user?.id,
      securityCompany: companyUser._id,
      requestedServices: ["vehicle-escort"],
      requestNumber: Math.floor(100000 + Math.random() * 900000),
      requestedDateTime: new Date(),
      priority: "medium",
      location: { coordinates: { latitude: lat, longitude: lng } },
      requestStatus: "pending",
      paymentId: null,
      escortTier: tierId,
      destination: destinationAddress,
      numVehicles: numVehicles ?? 1,
      isArmed: isArmed ?? true,
      price,
    });

    await serviceRequest.save();

    // Notify company
    const fcmDocs = await FcmToken.find({ userId: companyUser._id });
    const tokens = fcmDocs.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(
        tokens,
        "New Ride Along Request",
        "A client has booked a vehicle escort.",
        {
          type: "ride_along_request",
          serviceRequestId: String(serviceRequest._id),
          destination: destinationAddress,
          tier: tierId,
          price: String(price),
          numVehicles: String(numVehicles ?? 1),
          pickupLat: String(lat),
          pickupLng: String(lng),
        }
      );
    }

    return res.status(201).json({
      status: "OK",
      message: "Booking confirmed.",
      serviceRequestId: serviceRequest._id,
    });
  } catch (err: any) {
    console.error("Book error:", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/go-online ───────────────────────────────────────────
router.post("/go-online", decodeToken, authorizeSecurityCompany, async (req: any, res: any) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ status: "ERROR", message: "lat and lng required." });
    }
    await SecurityCompany.findByIdAndUpdate(req.user.profile, {
      isOnline: true,
      latitude: Number(lat),
      longitude: Number(lng),
    });
    return res.json({ status: "OK", message: "You are now online." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/go-offline ──────────────────────────────────────────
router.post("/go-offline", decodeToken, authorizeSecurityCompany, async (req: any, res: any) => {
  try {
    await SecurityCompany.findByIdAndUpdate(req.user.profile, { isOnline: false });
    return res.json({ status: "OK", message: "You are now offline." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

export default router;

// ─── POST /ride-along/v1/accept ───────────────────────────────────────────────
// Body: { serviceRequestId }

router.post("/accept", decodeToken, authorizeSecurityCompany, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });
    }

    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ status: "ERROR", message: "Service request not found." });
    }

    if (serviceRequest.requestStatus !== "pending") {
      return res.status(409).json({ status: "ERROR", message: "Request is no longer pending." });
    }

    serviceRequest.requestStatus = "approved";
    await serviceRequest.save();

    // Notify client via Ably
    await publishToEscortChannel(serviceRequestId, "status", {
      status: "accepted",
      message: "Your escort request has been accepted. Guard is on the way.",
      ts: Date.now(),
    });

    // Notify client via FCM
    const clientFcm = await FcmToken.find({ userId: serviceRequest.client });
    const tokens = clientFcm.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Escort Accepted!", "Your security escort is on the way.");
    }

    return res.json({ status: "OK", message: "Request accepted.", serviceRequestId });
  } catch (err: any) {
    console.error("Accept error:", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/decline ──────────────────────────────────────────────
// Body: { serviceRequestId }

router.post("/decline", decodeToken, authorizeSecurityCompany, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });
    }

    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ status: "ERROR", message: "Service request not found." });
    }

    serviceRequest.requestStatus = "rejected";
    await serviceRequest.save();

    // Try to reassign to next nearest verified company
    const lat = Number(serviceRequest.location?.coordinates?.latitude ?? 0);
    const lng = Number(serviceRequest.location?.coordinates?.longitude ?? 0);

    const companies = await SecurityCompany.find({
      isDeleted: false,
      verificationStatus: "verified",
      latitude: { $exists: true },
      longitude: { $exists: true },
      _id: { $ne: serviceRequest.securityCompany },
    }).select("_id latitude longitude");

    if (companies.length > 0) {
      let nearest = companies[0];
      let minDist = haversine(lat, lng, Number(nearest.latitude), Number(nearest.longitude));
      for (const c of companies) {
        const d = haversine(lat, lng, Number(c.latitude), Number(c.longitude));
        if (d < minDist) { minDist = d; nearest = c; }
      }

      const nextUser = await User.findOne({ profile: nearest._id });
      if (nextUser) {
        const newRequest = new ServiceRequest({
          ...serviceRequest.toObject(),
          _id: undefined,
          securityCompany: nextUser._id,
          requestStatus: "pending",
          requestNumber: Math.floor(100000 + Math.random() * 900000).toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await newRequest.save();

        const fcmDocs = await FcmToken.find({ userId: nextUser._id });
        const tokens = fcmDocs.map((d: any) => d.fcmToken);
        if (tokens.length > 0) {
          await sendNotification(tokens, "New Ride Along Request", "A client has booked a vehicle escort.");
        }
      }
    }

    return res.json({ status: "OK", message: "Request declined." });
  } catch (err: any) {
    console.error("Decline error:", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/location ─────────────────────────────────────────────
// Body: { serviceRequestId, lat, lng }

function calcBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

router.post("/location", decodeToken, authorizeSecurityCompany, async (req: any, res: any) => {
  try {
    const { serviceRequestId, lat, lng } = req.body;
    if (!serviceRequestId || lat == null || lng == null) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId, lat and lng required." });
    }

    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ status: "ERROR", message: "Service request not found." });
    }

    // Calculate bearing from previous location
    const prev = serviceRequest.driverLocation;
    let bearing = 0;
    if (prev?.latitude != null && prev?.longitude != null) {
      bearing = calcBearing(
        Number(prev.latitude), Number(prev.longitude),
        Number(lat), Number(lng)
      );
    }

    // Auto-promote to en_route on first GPS ping after approval
    if (serviceRequest.requestStatus === "approved") {
      serviceRequest.requestStatus = "en_route";
      await publishToEscortChannel(serviceRequestId, "status", {
        status: "en_route",
        message: "Guard is on the way.",
        ts: Date.now(),
      });
    }

    // Save new driver location
    serviceRequest.driverLocation = { latitude: lat, longitude: lng, updatedAt: new Date() };
    await serviceRequest.save();

    // Broadcast to client via Ably
    await publishToEscortChannel(serviceRequestId, "location", {
      lat: Number(lat),
      lng: Number(lng),
      bearing,
      ts: Date.now(),
    });

    return res.json({ status: "OK" });
  } catch (err: any) {
    console.error("Location error:", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/cancel ───────────────────────────────────────────────
// Either client or company can cancel before escort is in-progress
router.post("/cancel", decodeToken, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });
    }
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ status: "ERROR", message: "Service request not found." });
    }

    const cancellableStatuses = ["pending", "approved", "en_route", "arrived"];
    if (!cancellableStatuses.includes(serviceRequest.requestStatus)) {
      return res.status(409).json({ status: "ERROR", message: "Cannot cancel an escort that is already in progress or completed." });
    }

    serviceRequest.requestStatus = "rejected";
    await serviceRequest.save();

    await publishToEscortChannel(serviceRequestId, "status", {
      status: "cancelled",
      message: "The escort has been cancelled.",
      ts: Date.now(),
    });

    // Notify the other party via FCM
    const notifyUserId = req.user?.role === "GU"
      ? serviceRequest.securityCompany
      : serviceRequest.client;

    const fcmDocs = await FcmToken.find({ userId: notifyUserId });
    const tokens = fcmDocs.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Escort Cancelled", "The escort request has been cancelled.");
    }

    return res.json({ status: "OK", message: "Escort cancelled." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/arrived ──────────────────────────────────────────────
// Company calls this when they reach the client's pickup location
router.post("/arrived", decodeToken, authorizeSecurityCompany, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });
    }
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ status: "ERROR", message: "Service request not found." });
    }

    serviceRequest.requestStatus = "arrived";
    await serviceRequest.save();

    await publishToEscortChannel(serviceRequestId, "status", {
      status: "arrived",
      message: "Your guard has arrived at your location.",
      ts: Date.now(),
    });

    // FCM to client
    const clientFcm = await FcmToken.find({ userId: serviceRequest.client });
    const tokens = clientFcm.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Guard Arrived!", "Your security guard is at your location.");
    }

    return res.json({ status: "OK", message: "Marked as arrived.", serviceRequestId });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/start ────────────────────────────────────────────────
// Client calls this to confirm escort has started (after guard arrives)
router.post("/start", decodeToken, authorizeClient, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });
    }
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ status: "ERROR", message: "Service request not found." });
    }

    serviceRequest.requestStatus = "in-progress";
    await serviceRequest.save();

    await publishToEscortChannel(serviceRequestId, "status", {
      status: "in_progress",
      message: "Escort has started.",
      ts: Date.now(),
    });

    // FCM to company
    const companyFcm = await FcmToken.find({ userId: serviceRequest.securityCompany });
    const tokens = companyFcm.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Escort Started", "The client has confirmed the escort has started.");
    }

    return res.json({ status: "OK", message: "Escort started.", serviceRequestId });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /ride-along/v1/complete ─────────────────────────────────────────────
router.post("/complete", decodeToken, authorizeSecurityCompany, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });
    }
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ status: "ERROR", message: "Service request not found." });
    }
    serviceRequest.requestStatus = "completed";
    await serviceRequest.save();
    await publishToEscortChannel(serviceRequestId, "status", { status: "completed", ts: Date.now() });
    return res.json({ status: "OK", message: "Escort completed." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});
