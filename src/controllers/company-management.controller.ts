import express from "express";
import bcrypt from "bcrypt";
import decodeToken from "../middlewares/decodeToken";
import Guard from "../models/security-officer.model";
import Car from "../models/car.model";
import SecurityCompany from "../models/security-company.model";
import User from "../models/user.model";

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
      .select("-isDeleted")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: "OK", guards });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /company/v1/guards ──────────────────────────────────────────────────
// DEPRECATED: Use /security-company/v1/add-officer instead
// This endpoint kept for backward compatibility but uses new Guard model
router.post("/guards", decodeToken, authorizeCompany, async (req: any, res: any) => {
  try {
    const { firstName, lastName, psiraNumber, badgeNumber, phone, email, password, grade, isArmed, vehicleType, isTacticalTrained } = req.body;
    if (!firstName || !lastName || !psiraNumber || !badgeNumber || !phone || !email || !password || !grade) {
      return res.status(400).json({ status: "ERROR", message: "firstName, lastName, psiraNumber, badgeNumber, phone, email, password, and grade are required." });
    }

    // Create guard with new tier fields
    const guard = await Guard.create({
      firstName,
      lastName,
      psiraNumber,
      badgeNumber,
      phone,
      email,
      companyId: req.user.profile,
      grade,
      isArmed: isArmed ?? false,
      vehicleType: vehicleType ?? 'foot',
      isTacticalTrained: isTacticalTrained ?? false,
      available: true,
      isOnline: false,
      rating: 0,
      totalTrips: 0,
    });

    // Create user account for guard login
    const user = new User({
      userId: firstName.toLowerCase().slice(0, 4) + Math.floor(1000 + Math.random() * 9000),
      userName: `${firstName} ${lastName}`,
      email,
      profile: guard._id,
      passwordHash: password,
      role: "SO",
      permissions: "04",
    });
    await user.save();

    return res.status(201).json({
      status: "OK",
      guard: {
        _id: guard._id,
        firstName,
        lastName,
        badgeNumber,
        grade,
        isArmed,
        vehicleType,
      }
    });
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ status: "ERROR", message: "A guard with this email or badge number already exists." });
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
// Guard logs in with email + password (User account) → gets a JWT
router.post("/guards/login", async (req: any, res: any) => {
  try {
    const { email, password, fcmToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: "ERROR", message: "email and password are required." });
    }

    // Find user by email with role SO (Security Officer/Guard)
    const user = await User.findOne({ email, role: "SO" });
    if (!user) return res.status(404).json({ status: "ERROR", message: "Guard not found." });

    // Validate password
    const bcrypt = require("bcrypt");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ status: "ERROR", message: "Invalid password." });

    // Get guard profile
    const guard = await Guard.findById(user.profile);
    if (!guard || guard.isDeleted) {
      return res.status(404).json({ status: "ERROR", message: "Guard profile not found." });
    }

    // Save FCM token if provided
    if (fcmToken) {
      guard.fcmToken = fcmToken;
      await guard.save();
    }

    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { guardId: guard._id, companyId: guard.companyId, role: "SO" },
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
