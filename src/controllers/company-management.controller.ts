import express from "express";
import bcrypt from "bcrypt";
import decodeToken from "../middlewares/decodeToken";
import Guard from "../models/security-officer.model";
import Car from "../models/car.model";
import SecurityCompany from "../models/security-company.model";

const router = express.Router();

// ─── Middleware: company only ─────────────────────────────────────────────────
const authorizeCompany = (req: any, res: any, next: any) => {
  if (req.user?.role !== "MG") {
    return res.status(403).json({ status: "ERROR", message: "Company access only." });
  }
  next();
};

// ─── GET /company/v1/profile ──────────────────────────────────────────────────
router.get("/profile", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    const company = await SecurityCompany.findOne({ _id: req.user.profile }).lean();
    if (!company) return res.status(404).json({ status: "ERROR", message: "Company not found." });
    return res.json({ status: "OK", company });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── GET /company/v1/guards ───────────────────────────────────────────────────
router.get("/guards", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    const guards = await Guard.find({ companyId: req.user.profile, isDeleted: false })
      .select("-pin")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: "OK", guards });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /company/v1/guards ──────────────────────────────────────────────────
router.post("/guards", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    const { firstName, lastName, psiraNumber, pin } = req.body;
    if (!firstName || !lastName || !psiraNumber || !pin) {
      return res.status(400).json({ status: "ERROR", message: "firstName, lastName, psiraNumber and pin are required." });
    }
    if (pin.length !== 4 || isNaN(Number(pin))) {
      return res.status(400).json({ status: "ERROR", message: "PIN must be exactly 4 digits." });
    }
    const hashedPin = await bcrypt.hash(pin, 10);
    const guard = await Guard.create({
      firstName,
      lastName,
      psiraNumber,
      pin: hashedPin,
      companyId: req.user.profile,
      available: true,
      isOnline: false,
    });
    return res.status(201).json({ status: "OK", guard: { ...guard.toObject(), pin: undefined } });
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ status: "ERROR", message: "A guard with this PSIRA number already exists." });
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── DELETE /company/v1/guards/:id ───────────────────────────────────────────
router.delete("/guards/:id", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    await Guard.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.profile },
      { isDeleted: true }
    );
    return res.json({ status: "OK", message: "Guard removed." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── GET /company/v1/cars ─────────────────────────────────────────────────────
router.get("/cars", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    const cars = await Car.find({ companyId: req.user.profile, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: "OK", cars });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /company/v1/cars ────────────────────────────────────────────────────
router.post("/cars", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    const { plate, model, type, year } = req.body;
    if (!plate || !model || !type || !year) {
      return res.status(400).json({ status: "ERROR", message: "plate, model, type and year are required." });
    }
    const car = await Car.create({
      plate: plate.toUpperCase(),
      model,
      type,
      year: Number(year),
      companyId: req.user.profile,
      available: true,
    });
    return res.status(201).json({ status: "OK", car });
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ status: "ERROR", message: "A car with this plate already exists." });
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── DELETE /company/v1/cars/:id ─────────────────────────────────────────────
router.delete("/cars/:id", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    await Car.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.profile },
      { isDeleted: true }
    );
    return res.json({ status: "OK", message: "Car removed." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /company/v1/guards/login ───────────────────────────────────────────
// Guard logs in with psiraNumber + PIN → gets a JWT with guardId + companyId
router.post("/guards/login", async (req: any, res: any) => {
  try {
    const { psiraNumber, pin, fcmToken } = req.body;
    if (!psiraNumber || !pin) {
      return res.status(400).json({ status: "ERROR", message: "psiraNumber and pin are required." });
    }
    const guard = await Guard.findOne({ psiraNumber, isDeleted: false });
    if (!guard) return res.status(404).json({ status: "ERROR", message: "Guard not found." });

    const valid = await bcrypt.compare(pin, guard.pin);
    if (!valid) return res.status(401).json({ status: "ERROR", message: "Invalid PIN." });

    // Save FCM token if provided
    if (fcmToken) {
      guard.fcmToken = fcmToken;
      await guard.save();
    }

    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { guardId: guard._id, companyId: guard.companyId, role: "GD" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "30d" }
    );

    return res.json({
      status: "OK",
      token,
      guard: {
        _id: guard._id,
        firstName: guard.firstName,
        lastName: guard.lastName,
        psiraNumber: guard.psiraNumber,
        companyId: guard.companyId,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

export default router;
