import express from "express";
import { body } from "express-validator";
import adminServices from "../services/admin.services";
import decodeToken from "../middlewares/decodeToken";
import User from "../models/user.model";
import SecurityCompany from "../models/security-company.model";
import Driver from "../models/driver.model";
import ServiceRequest from "../models/service-requests.model";

const router = express.Router();

// ─── Middleware: admin only ────────────────────────────────────────────────────
const authorizeAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "AD") {
    return res.status(403).json({ status: "ERROR", message: "Admin access only." });
  }
  next();
};

// ─── POST /admin/v1/register ──────────────────────────────────────────────────
router.post(
  "/register",
  body("userName").notEmpty().isLength({ min: 3 }),
  body("email").isEmail().notEmpty(),
  body("password").notEmpty().isLength({ min: 6 }),
  adminServices.register
);

// ─── GET /admin/v1/stats ──────────────────────────────────────────────────────
router.get("/stats", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    const [companies, drivers, clients, orders] = await Promise.all([
      User.countDocuments({ role: "MG", isDeleted: false }),
      User.countDocuments({ role: "DR", isDeleted: false }),
      User.countDocuments({ role: "GU", isDeleted: false }),
      ServiceRequest.countDocuments({}),
    ]);

    const [pendingCompanies, pendingDrivers, activeOrders] = await Promise.all([
      SecurityCompany.countDocuments({ verificationStatus: "unverified", isDeleted: false }),
      Driver.countDocuments({ verificationStatus: "unverified", isDeleted: false }),
      ServiceRequest.countDocuments({ requestStatus: { $in: ["pending", "approved", "en_route", "arrived", "in-progress"] } }),
    ]);

    return res.json({ status: "OK", companies, drivers, clients, orders, pendingCompanies, pendingDrivers, activeOrders });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── GET /admin/v1/security-companies ─────────────────────────────────────────
router.get("/security-companies", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    const users = await User.find({ role: "MG", isDeleted: false })
      .populate("profile")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: "OK", companies: users });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /admin/v1/security-companies/:id/verify ─────────────────────────────
router.post("/security-companies/:id/verify", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    await SecurityCompany.findByIdAndUpdate(req.params.id, {
      verificationStatus: "verified",
      verifiedAt: new Date(),
      verifiedBy: req.user._id,
    });
    return res.json({ status: "OK", message: "Company verified." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /admin/v1/security-companies/:id/decline ────────────────────────────
router.post("/security-companies/:id/decline", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    await SecurityCompany.findByIdAndUpdate(req.params.id, { verificationStatus: "declined" });
    return res.json({ status: "OK", message: "Company declined." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── GET /admin/v1/drivers ────────────────────────────────────────────────────
router.get("/drivers", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    const users = await User.find({ role: "DR", isDeleted: false })
      .populate("profile")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: "OK", drivers: users });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /admin/v1/drivers/:id/verify ───────────────────────────────────────
router.post("/drivers/:id/verify", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    await Driver.findByIdAndUpdate(req.params.id, { verificationStatus: "verified" });
    return res.json({ status: "OK", message: "Driver verified." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── POST /admin/v1/drivers/:id/decline ──────────────────────────────────────
router.post("/drivers/:id/decline", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    await Driver.findByIdAndUpdate(req.params.id, { verificationStatus: "declined" });
    return res.json({ status: "OK", message: "Driver declined." });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

// ─── GET /admin/v1/clients ────────────────────────────────────────────────────
router.get("/clients", decodeToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    const users = await User.find({ role: "GU", isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: "OK", clients: users });
  } catch (err: any) {
    return res.status(500).json({ status: "ERROR", message: err.message });
  }
});

export default router;
