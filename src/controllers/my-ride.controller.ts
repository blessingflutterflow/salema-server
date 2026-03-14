import express from "express";
import bcrypt from "bcrypt";
import ServiceRequest from "../models/service-requests.model";
import Driver from "../models/driver.model";
import User from "../models/user.model";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";
import authorizeDriver from "../middlewares/authorizeDriver";
import { publishToEscortChannel } from "../utils/helpers/ably";

const router = express.Router();
const MAPS_KEY = process.env.GOOGLE_MAPS_KEY ?? "";

// ─── My Ride Pricing ──────────────────────────────────────────────────────────
// Formula: S + D(km×R6) + D(destination) + T(time) + W(weather) + D(demand) + C(city)
// S = service base fee, rest come from client query params

const MY_RIDE_TIERS = [
  {
    id: "economy",
    label: "Economy",
    description: "Regular car · 2015–2026 · Safe & comfortable",
    baseFee: 10,
  },
  {
    id: "premium",
    label: "Premium",
    description: "Comfortable ride · More space · 2021–2026",
    baseFee: 10,
  },
  {
    id: "presidential",
    label: "Presidential",
    description: "Executive SUV · Top comfort · 2022–2026",
    baseFee: 30,
  },
] as const;

const DESTINATION_SURCHARGE: Record<string, number> = {
  township: 10,
  cbd: 10,
  suburb: 10,
};

const TIME_SURCHARGE = (): number => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 10;
  if (hour >= 12 && hour < 18) return 15;
  if (hour >= 18 && hour < 24) return 40;
  return 50; // 00:00–06:00
};

const WEATHER_SURCHARGE: Record<string, number> = {
  normal: 0,
  raining: 8,
};

const DEMAND_SURCHARGE: Record<string, number> = {
  low: 0,
  high: 10,
};

const CITY_SURCHARGE: Record<string, number> = {
  metro: 5,
  city: 10,
  township: 5,
};

function calcMyRidePrice(
  baseFee: number,
  distanceKm: number,
  destinationType: string,
  weather: string,
  demand: string,
  cityType: string
): number {
  return (
    baseFee +
    Math.round(distanceKm * 6) +
    (DESTINATION_SURCHARGE[destinationType] ?? 10) +
    TIME_SURCHARGE() +
    (WEATHER_SURCHARGE[weather] ?? 0) +
    (DEMAND_SURCHARGE[demand] ?? 0) +
    (CITY_SURCHARGE[cityType] ?? 5)
  );
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

function calcBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── POST /my-ride/v1/register ────────────────────────────────────────────────
// Registers a new driver (creates Driver profile + User with role DR)

router.post("/register", async (req: any, res: any) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      idNumber,
      licenceNumber,
      carMake,
      carModel,
      carYear,
      carColor,
      carPlate,
      latitude,
      longitude,
    } = req.body;

    const required = [firstName, lastName, email, phone, password, idNumber, licenceNumber, carMake, carModel, carYear, carColor, carPlate];
    if (required.some(f => !f)) {
      return res.status(400).json({ status: "ERROR", message: "All fields are required." });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ status: "ERROR", message: "Email already registered." });
    }

    const driver = new Driver({
      firstName,
      lastName,
      phone,
      idNumber,
      licenceNumber,
      carMake,
      carModel,
      carYear: Number(carYear),
      carColor,
      carPlate,
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      verificationStatus: "unverified",
    });

    const savedDriver = await driver.save();

    const user = new User({
      userName: `${firstName} ${lastName}`,
      userId: `DR-${Date.now()}`,
      email,
      passwordHash: password,
      role: "DR",
      permissions: "05",
      profile: savedDriver._id,
    });

    await user.save();

    return res.status(201).json({
      status: "OK",
      message: "Driver registered successfully. Await admin verification.",
    });
  } catch (err: any) {
    console.error("Driver register error:", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── GET /my-ride/v1/estimate ─────────────────────────────────────────────────
// Params: originLat, originLng, destinationPlaceId, destinationType, weather, demand, cityType

router.get("/estimate", async (req: any, res: any) => {
  const {
    originLat,
    originLng,
    destinationPlaceId,
    destinationType = "suburb",
    weather = "normal",
    demand = "low",
    cityType = "city",
  } = req.query as Record<string, string>;

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
      return res.status(422).json({ error: "Could not calculate route", status: data.status });
    }

    const leg = data.routes[0].legs[0];
    const distanceKm = leg.distance.value / 1000;
    const durationMin = Math.ceil(leg.duration.value / 60);
    const polyline: string = data.routes[0].overview_polyline.points;

    const tiers = MY_RIDE_TIERS.map(t => ({
      id: t.id,
      label: t.label,
      description: t.description,
      price: calcMyRidePrice(t.baseFee, distanceKm, destinationType, weather, demand, cityType),
      eta: `~${durationMin + (t.id === "presidential" ? 5 : t.id === "premium" ? 3 : 0)} min`,
    }));

    return res.json({
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMin,
      polyline,
      tiers,
    });
  } catch (err) {
    console.error("My ride estimate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /my-ride/v1/book ────────────────────────────────────────────────────

router.post("/book", decodeToken, authorizeClient, async (req: any, res: any) => {
  try {
    const { pickupLat, pickupLng, destinationAddress, tierId, price } = req.body;

    if (!pickupLat || !pickupLng || !destinationAddress || !tierId || !price) {
      return res.status(400).json({ status: "ERROR", message: "Missing required fields." });
    }

    const lat = parseFloat(pickupLat);
    const lng = parseFloat(pickupLng);

    // Find nearest verified driver
    const drivers = await Driver.find({
      isDeleted: false,
      verificationStatus: "verified",
    }).select("_id latitude longitude");

    if (drivers.length === 0) {
      return res.status(404).json({ status: "ERROR", message: "No drivers available in your area." });
    }

    let nearest = drivers[0];
    let minDist = haversine(lat, lng, Number(nearest.latitude), Number(nearest.longitude));
    for (const d of drivers) {
      const dist = haversine(lat, lng, Number(d.latitude), Number(d.longitude));
      if (dist < minDist) { minDist = dist; nearest = d; }
    }

    const driverUser = await User.findOne({ profile: nearest._id, role: "DR" });
    if (!driverUser) {
      return res.status(404).json({ status: "ERROR", message: "Could not resolve driver account." });
    }

    const serviceRequest = new ServiceRequest({
      client: req.user?.id,
      securityCompany: driverUser._id, // reuse field — stores driver userId
      requestedServices: ["my-ride"],
      requestNumber: Math.floor(100000 + Math.random() * 900000),
      requestedDateTime: new Date(),
      priority: "medium",
      location: { coordinates: { latitude: lat, longitude: lng } },
      requestStatus: "pending",
      paymentId: null,
      escortTier: tierId,
      destination: destinationAddress,
      numVehicles: 1,
      isArmed: false,
      price,
    });

    await serviceRequest.save();

    // Notify driver via FCM
    const fcmDocs = await FcmToken.find({ userId: driverUser._id });
    const tokens = fcmDocs.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(
        tokens,
        "New Ride Request",
        "A client has booked a ride.",
        {
          type: "ride_along_request", // same type — reuses CompanyHome FCM handler
          serviceRequestId: String(serviceRequest._id),
          destination: destinationAddress,
          tier: tierId,
          price: String(price),
          numVehicles: "1",
          pickupLat: String(lat),
          pickupLng: String(lng),
        }
      );
    }

    return res.status(201).json({
      status: "OK",
      message: "Ride booked.",
      serviceRequestId: serviceRequest._id,
    });
  } catch (err: any) {
    console.error("My ride book error:", err);
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /my-ride/v1/accept ──────────────────────────────────────────────────

router.post("/accept", decodeToken, authorizeDriver, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });

    const sr = await ServiceRequest.findById(serviceRequestId);
    if (!sr) return res.status(404).json({ status: "ERROR", message: "Not found." });
    if (sr.requestStatus !== "pending") return res.status(409).json({ status: "ERROR", message: "Request no longer pending." });

    sr.requestStatus = "approved";
    await sr.save();

    await publishToEscortChannel(serviceRequestId, "status", {
      status: "accepted",
      message: "Your driver has accepted. They are on the way.",
      ts: Date.now(),
    });

    const clientFcm = await FcmToken.find({ userId: sr.client });
    const tokens = clientFcm.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Ride Accepted!", "Your driver is on the way.");
    }

    return res.json({ status: "OK", serviceRequestId });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /my-ride/v1/decline ─────────────────────────────────────────────────

router.post("/decline", decodeToken, authorizeDriver, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });

    const sr = await ServiceRequest.findById(serviceRequestId);
    if (!sr) return res.status(404).json({ status: "ERROR", message: "Not found." });

    sr.requestStatus = "rejected";
    await sr.save();

    return res.json({ status: "OK", message: "Ride declined." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /my-ride/v1/location ────────────────────────────────────────────────

router.post("/location", decodeToken, authorizeDriver, async (req: any, res: any) => {
  try {
    const { serviceRequestId, lat, lng } = req.body;
    if (!serviceRequestId || lat == null || lng == null) {
      return res.status(400).json({ status: "ERROR", message: "serviceRequestId, lat and lng required." });
    }

    const sr = await ServiceRequest.findById(serviceRequestId);
    if (!sr) return res.status(404).json({ status: "ERROR", message: "Not found." });

    const prev = sr.driverLocation;
    let bearing = 0;
    if (prev?.latitude != null && prev?.longitude != null) {
      bearing = calcBearing(Number(prev.latitude), Number(prev.longitude), Number(lat), Number(lng));
    }

    if (sr.requestStatus === "approved") {
      sr.requestStatus = "en_route";
      await publishToEscortChannel(serviceRequestId, "status", {
        status: "en_route",
        message: "Your driver is on the way.",
        ts: Date.now(),
      });
    }

    sr.driverLocation = { latitude: lat, longitude: lng, updatedAt: new Date() };
    await sr.save();

    await publishToEscortChannel(serviceRequestId, "location", {
      lat: Number(lat),
      lng: Number(lng),
      bearing,
      ts: Date.now(),
    });

    return res.json({ status: "OK" });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /my-ride/v1/arrived ─────────────────────────────────────────────────

router.post("/arrived", decodeToken, authorizeDriver, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });

    const sr = await ServiceRequest.findById(serviceRequestId);
    if (!sr) return res.status(404).json({ status: "ERROR", message: "Not found." });

    sr.requestStatus = "arrived";
    await sr.save();

    await publishToEscortChannel(serviceRequestId, "status", {
      status: "arrived",
      message: "Your driver has arrived.",
      ts: Date.now(),
    });

    const clientFcm = await FcmToken.find({ userId: sr.client });
    const tokens = clientFcm.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Driver Arrived!", "Your driver is at your location.");
    }

    return res.json({ status: "OK", serviceRequestId });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /my-ride/v1/start ───────────────────────────────────────────────────

router.post("/start", decodeToken, authorizeClient, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });

    const sr = await ServiceRequest.findById(serviceRequestId);
    if (!sr) return res.status(404).json({ status: "ERROR", message: "Not found." });

    sr.requestStatus = "in-progress";
    await sr.save();

    await publishToEscortChannel(serviceRequestId, "status", {
      status: "in_progress",
      message: "Ride has started.",
      ts: Date.now(),
    });

    const driverFcm = await FcmToken.find({ userId: sr.securityCompany });
    const tokens = driverFcm.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Ride Started", "The client has confirmed the ride.");
    }

    return res.json({ status: "OK", serviceRequestId });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /my-ride/v1/cancel ──────────────────────────────────────────────────

router.post("/cancel", decodeToken, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });

    const sr = await ServiceRequest.findById(serviceRequestId);
    if (!sr) return res.status(404).json({ status: "ERROR", message: "Not found." });

    const cancellable = ["pending", "approved", "en_route", "arrived"];
    if (!cancellable.includes(sr.requestStatus)) {
      return res.status(409).json({ status: "ERROR", message: "Cannot cancel a ride that is in progress or completed." });
    }

    sr.requestStatus = "rejected";
    await sr.save();

    await publishToEscortChannel(serviceRequestId, "status", {
      status: "cancelled",
      message: "The ride has been cancelled.",
      ts: Date.now(),
    });

    const notifyUserId = req.user?.role === "GU" ? sr.securityCompany : sr.client;
    const fcmDocs = await FcmToken.find({ userId: notifyUserId });
    const tokens = fcmDocs.map((d: any) => d.fcmToken);
    if (tokens.length > 0) {
      await sendNotification(tokens, "Ride Cancelled", "The ride request has been cancelled.");
    }

    return res.json({ status: "OK", message: "Ride cancelled." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /my-ride/v1/complete ────────────────────────────────────────────────

router.post("/complete", decodeToken, authorizeDriver, async (req: any, res: any) => {
  try {
    const { serviceRequestId } = req.body;
    if (!serviceRequestId) return res.status(400).json({ status: "ERROR", message: "serviceRequestId required." });

    const sr = await ServiceRequest.findById(serviceRequestId);
    if (!sr) return res.status(404).json({ status: "ERROR", message: "Not found." });

    sr.requestStatus = "completed";
    await sr.save();

    await publishToEscortChannel(serviceRequestId, "status", { status: "completed", ts: Date.now() });

    return res.json({ status: "OK", message: "Ride completed." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

export default router;
