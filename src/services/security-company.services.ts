import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";

import SecurityCompany from "../models/security-company.model";
import User from "../models/user.model";
import {
  RegisterCompanyDto,
  UpdateCompanyDto,
} from "../utils/types/security-company";
import CustomRequest from "../utils/types/express";
import SecurityOfficer from "../models/security-officer.model";
import { RegisterOfficerDto } from "../utils/types/security-officer";
import { Types } from "mongoose";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import { sendEmail } from "../utils/helpers/mailer";
import { registerSecurityOfficerEmailBody } from "../utils/helpers/templates/register-security-officer-template";
import {sendAdminNotification} from './email.Services'

const register = async (req: Request, res: Response): Promise<any> => {
  let savedCompany = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const {
      companyName,
      contactPerson,
      phone,
      psiraNumber,
      email,
      password,
      branches,
      securityServices,
      address,
      latitude,
      longitude,
    }: RegisterCompanyDto = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: "ERROR",
        message: "User already exists with this email",
      });
    }

    const securityCompany = new SecurityCompany({
      companyName,
      contactPerson,
      phone,
      psiraNumber,
      address,
      email,
      latitude,
      longitude,
      servicesOffered: securityServices,
      branches,
    });

    savedCompany = await securityCompany.save();
    sendAdminNotification(companyName, email, phone);

    const user = new User({
      userName: companyName,
      userId:
        companyName.toLowerCase().slice(0, 4) +
        Math.floor(1000 + Math.random() * 9000),
      email,
      passwordHash: password,
      role: "MG",
      permissions: "03",
      profile: savedCompany._id,
    });

    await user.save();

    const fcmTokens = await FcmToken.find({ role: "AD" }).select("fcmToken");
    const tokens = fcmTokens.map((tokenDoc) => tokenDoc.fcmToken);

    await sendNotification(
      tokens,
      "New Security Company Registered!",
      `A new security company has been registered`
    );

    return res.status(201).json({
      status: "OK",
      message: "Registered Security Company",
    });
  } catch (error: any) {
    // Handle duplicate key errors for phone or email
    if (error.code === 11000) {
      let duplicateField = Object.keys(error.keyValue)[0];
      let message = "";
      if (duplicateField === "phone") message = "Phone number already exists";
      if (duplicateField === "email") message = "Email already exists";

      return res.status(409).json({
        status: "ERROR",
        message,
      });
    }

    if (savedCompany) {
      await SecurityCompany.deleteOne({ _id: savedCompany._id });
    }

    return res.status(400).json({
      status: "ERROR",
      message: "Error registering security company and user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const verify = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }
    const { id } = req.params;
    const userId = req.user?.id;

    const securityCompany = await SecurityCompany.findById(id);

    if (!securityCompany) {
      return res.status(404).json({
        status: "ERROR",
        message: "Security company not found",
      });
    }

    securityCompany.verificationStatus = "verified";
    securityCompany.verifiedAt = new Date();
    securityCompany.verifiedBy = userId;

    await securityCompany.save();

    return res.status(200).json({
      status: "OK",
      message: "Security company verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      message: "Error verifying security company",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const decline = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }
    const { id } = req.params;
    const userId = req.user?.id;

    const securityCompany = await SecurityCompany.findById(id);

    if (!securityCompany) {
      return res.status(404).json({
        status: "ERROR",
        message: "Security company not found",
      });
    }

    securityCompany.verificationStatus = "declined";
    securityCompany.verifiedAt = new Date();
    securityCompany.verifiedBy = userId;

    await securityCompany.save();

    return res.status(200).json({
      status: "OK",
      message: "Security company declined successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      message: "Error declining security company",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const addOfficer = async (req: CustomRequest, res: Response): Promise<any> => {
  let savedOfficer = null;
  let savedUser = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      psiraNumber,
      phone,
      availabilityStatus,
      skills,
      experienceYears,
      email,
      password,
      grade,
    }: RegisterOfficerDto = req.body;
    const requestUserId = req.user?.id;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "ERROR",
        message: "Email already in use",
      });
    }

    const requestedUser = await User.findById(requestUserId);

    const securityOfficer = new SecurityOfficer({
      firstName,
      lastName,
      psiraNumber,
      phone,
      grade,
      availabilityStatus,
      skills,
      experienceYears,
      assignedBy: requestUserId,
      assignedCompany: requestedUser?.profile,
    });

    savedOfficer = await securityOfficer.save();

    const user = new User({
      userId:
        firstName.toLowerCase().slice(0, 4) +
        Math.floor(1000 + Math.random() * 9000),
      userName: `${firstName} ${lastName}`,
      email,
      profile: savedOfficer._id,
      passwordHash: password,
      role: "SO",
      permissions: "04",
    });

    savedUser = await user.save();

    await SecurityCompany.findByIdAndUpdate(
      requestedUser?.profile,
      { $push: { officers: savedUser._id } },
      { new: true }
    );

    requestedUser &&
      sendEmail({
        to: [email],
        subject: "Account was created for you",
        html: registerSecurityOfficerEmailBody(
          `${firstName} ${lastName}`,
          email,
          password,
          requestedUser.userName,
          requestedUser.email
        ),
      }).catch((err) => {
        console.error("Error sending emails:", err);
      });

    return res.status(201).json({
      status: "OK",
      message: "Security officer added successfully",
    });
  } catch (error) {
    if (savedOfficer) {
      await SecurityOfficer.findByIdAndDelete(savedOfficer._id);
    }
    if (savedUser) {
      await User.findByIdAndDelete(savedUser._id);
    }

    return res.status(500).json({
      status: "ERROR",
      message: "Error adding security officer",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const listOfficers = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  const userId = req.user?.profile;
  try {
    const securityCompany = await SecurityCompany.findById(userId).populate({
      path: "officers",
      model: "User",
      select: "-passwordHash -userId -userName -createdAt -updatedAt",
      populate: {
        path: "profile",
        select: "-assignedCompany -assignedBy -isDeleted -createdAt -updatedAt",
        model: "SecurityOfficer",
      },
    });

    if (!securityCompany) {
      return res.status(404).json({
        status: "ERROR",
        message: "Security company not found for this user",
      });
    }

    return res
      .status(200)
      .json({ status: "OK", officers: securityCompany.officers });
  } catch (error: any) {
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

const listCompanies = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const companies = await SecurityCompany.find({
      isDeleted: false,
      verificationStatus: "verified",
    })
      .select(
        "-createdAt -updatedAt -verificationStatus -verifiedBy -verifiedAt -isDeleted"
      )
      .populate({
        path: "officers",
        model: "User",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select: "-createdAt -updatedAt -isDeleted -remarks",
        },
        select:
          "-passwordHash -userId -userName -permissions -createdAt -updatedAt -isDeleted",
      });
    return res.status(200).json({ status: "OK", companies });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal Server Error" });
  }
};

const getCompanyProfile = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id: companyId } = req.params;

    const securityCompanyProfile = await SecurityCompany.findById(
      companyId
    ).select("-isDeleted -createdAt -updatedAt -verifiedBy -verifiedAt");

    if (!securityCompanyProfile) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Company not found" });
    }

    return res.status(200).json({ status: "OK", data: securityCompanyProfile });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal Server Error" });
  }
};

const updateSecurityCompany = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const id = req.user?.profile;
    const {
      companyName,
      address,
      psiraNumber,
      contactPerson,
      phone,
      securityServices,
      branches,
    }: UpdateCompanyDto = req.body;

    const updatedCompany = await SecurityCompany.findByIdAndUpdate(
      id,
      {
        companyName,
        address,
        psiraNumber,
        contactPerson,
        phone,
        servicesOffered: securityServices,
        branches,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Company not found" });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Updated profile successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: "Server error" });
  }
};

const deleteCompany = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id: companyId } = req.params;

    const updatedClient = await SecurityCompany.findByIdAndUpdate(
      companyId,
      { isDeleted: true },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Company not found" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { profile: companyId },
      { isDeleted: true },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      await SecurityCompany.findByIdAndUpdate(companyId, { isDeleted: false });
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Deleted successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: "Server error" });
  }
};

const deleteOfficer = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const officerId = req.params.id;
    const officerObjectId = new Types.ObjectId(officerId);

    const companyId = req.user?.profile;

    const securityCompany = await SecurityCompany.findById(companyId);

    if (!securityCompany) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Security company not found" });
    }

    const officerIndex = securityCompany.officers.indexOf(officerObjectId);

    if (officerIndex === -1) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Officer not found in the company" });
    }

    securityCompany.officers.splice(officerIndex, 1);
    await securityCompany.save();

    return res.status(200).json({
      status: "OK",
      message: "Officer deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal Server Error" });
  }
};

const listAll = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const companies = await SecurityCompany.find({
      isDeleted: false,
    })
      .select("-createdAt -updatedAt -verifiedBy -verifiedAt -isDeleted")
      .populate({
        path: "officers",
        model: "User",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select: "-createdAt -updatedAt -isDeleted -remarks",
        },
        select:
          "-passwordHash -userId -userName -permissions -createdAt -updatedAt -isDeleted",
      });
    return res.status(200).json({ status: "OK", companies });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal Server Error" });
  }
};

const myProfile = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const companyId = req.user?.profile;

    const profile = await SecurityCompany.findById(companyId)
      .select("-isDeleted -createdAt -updatedAt -verifiedBy -verifiedAt")
      .populate({
        path: "officers",
        model: "User",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select: "-createdAt -updatedAt -isDeleted -remarks",
        },
        select:
          "-passwordHash -userId -userName -permissions -createdAt -updatedAt -isDeleted",
      });

    if (!profile) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Company not found" });
    }

    return res.status(200).json({ status: "OK", profile });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal Server Error" });
  }
};

const getSecurityCompanyPhones = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const companies = await SecurityCompany.find({
      isDeleted: false,
      verificationStatus: "verified",
    }).select("phone companyName");

    const phones = companies.map((company) => ({
      companyName: company.companyName,
      phone: company.phone,
    }));

    return res.status(200).json({
      status: "OK",
      phones,
    });
  } catch (error) {
    console.error("Error fetching company phones:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch security company phones",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const findNearestCompany = async (req: Request, res: Response): Promise<any> => {
  try {
    const { latitude, longitude } = req.body;

    const companies = await SecurityCompany.find({
      isDeleted: false,
      verificationStatus: "verified",
      latitude: { $exists: true },
      longitude: { $exists: true },
    }).select("companyName phone latitude longitude");
    

    if (companies.length === 0) {
      return res.status(404).json({ status: "ERROR", message: "No companies found" });
    }

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // distance in km
    };
    
    // Find the nearest
    let nearest = companies[0];
    let minDistance = calculateDistance(latitude, longitude, nearest.latitude, nearest.longitude);

    for (const company of companies) {
      const distance = calculateDistance(latitude, longitude, company.latitude, company.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = company;
      }
    }

    return res.status(200).json({
      status: "OK",
      nearestCompany: {
        name: nearest.companyName,
        phone: nearest.phone,
        distance: minDistance.toFixed(2) + " km",
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: "Internal Server Error" });
  }
};



export default {
  register,
  verify,
  addOfficer,
  listOfficers,
  listCompanies,
  getCompanyProfile,
  updateSecurityCompany,
  deleteCompany,
  deleteOfficer,
  listAll,
  decline,
  myProfile,
  getSecurityCompanyPhones,
  findNearestCompany,
};