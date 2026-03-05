import express from "express";
import ServiceRequest from "../models/service-requests.model";
import SecurityCompany from "../models/security-company.model";
import User from "../models/user.model";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";

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
      latitude: { $exists: true },
      longitude: { $exists: true },
    }).select("_id latitude longitude");

    if (companies.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "No verified security companies available in your area.",
      });
    }

    let nearest = companies[0];
    let minDist = haversine(lat, lng, nearest.latitude, nearest.longitude);
    for (const c of companies) {
      const d = haversine(lat, lng, c.latitude, c.longitude);
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
      await sendNotification(tokens, "New Ride Along Request", "A client has booked a vehicle escort.");
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

export default router;
