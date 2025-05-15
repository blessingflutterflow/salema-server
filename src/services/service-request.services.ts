import { Response } from "express";
import { validationResult } from "express-validator";

import ServiceRequest from "../models/service-requests.model";
import CustomRequest from "../utils/types/express";
import { ISecurityCompany } from "../utils/types/security-company";
import FcmToken from "../models/fcmToken.model";
import User from "../models/user.model";
import { IFcmToken } from "../utils/types/fcm";
import {
  CreateRequestDto,
  UpdateRequestDto,
} from "../utils/types/service-requests";
import Client from "../models/client.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import { sendEmail } from "../utils/helpers/mailer";
import { serviceRequestUpdateEmailBody } from "../utils/helpers/templates/service-request-update-template";
import EmergencyContact from "../models/emergency-contact.model";

function isSecurityCompany(profile: any): profile is ISecurityCompany {
  return profile && typeof profile.verificationStatus === "string";
}

export const create = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = req.user?.id;
    const {
      requestedServices,
      requestedDateTime,
      priority,
      location,
      body,
    }: CreateRequestDto = req.body;

    const securityCompanyInfo = await User.findOne({
      profile: req.body.securityCompany,
    }).populate({ path: "profile", model: "SecurityCompany" });

    let verificationStatus;
    if (isSecurityCompany(securityCompanyInfo?.profile)) {
      verificationStatus = securityCompanyInfo.profile.verificationStatus;
    }

    if (!securityCompanyInfo) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Failed to find security company" });
    }

    if (verificationStatus !== "verified") {
      return res
        .status(403)
        .json({ status: "ERROR", message: "Security company not authorized." });
    }

    const serviceRequest = new ServiceRequest({
      client,
      securityCompany: securityCompanyInfo._id,
      requestedServices,
      requestNumber: Math.floor(100000 + Math.random() * 900000),
      requestedDateTime,
      priority,
      location: { coordinates: location },
      body,
      officers: [],
      requestStatus: "pending",
      paymentId: null,
    });

    await Client.findByIdAndUpdate(req.user?.profile, {
      $push: { securityCompaniesUsed: securityCompanyInfo.profile },
    });

    await serviceRequest.save();

    const fcmTokenDoc: IFcmToken[] = await FcmToken.find({
      userId: securityCompanyInfo._id,
    });
    const tokens = fcmTokenDoc.map((tokenDoc) => tokenDoc.fcmToken);

    await sendNotification(
      tokens,
      "New Service Request",
      "A new service request has been created."
    );

    return res
      .status(201)
      .json({ status: "OK", message: "Request created successfully." });
  } catch (error: any) {
    console.error(error);

    return res.status(400).json({ status: "ERROR", message: error.message });
  }
};

export const update = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      serviceRequestId,
      status,
      assignedOfficers,
      body,
    }: UpdateRequestDto = req.body;

    const serviceRequest = await ServiceRequest.findById(serviceRequestId);

    if (
      !serviceRequest ||
      !serviceRequest.securityCompany.equals(req.user?.id)
    ) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Service request not found." });
    }

    const securityCompanyInfo: any = await User.findById(
      serviceRequest.securityCompany
    ).populate({
      path: "profile",
      model: "SecurityCompany",
    });

    if (
      !securityCompanyInfo ||
      !securityCompanyInfo._id.equals(req.user?._id)
    ) {
      return res
        .status(403)
        .json({ status: "ERROR", message: "No permission to change status" });
    }

    const officers = securityCompanyInfo.profile.officers;
    const officerIdsSet = new Set(
      officers.map((officer: any) => officer.toString())
    );

    if (assignedOfficers && Array.isArray(assignedOfficers)) {
      const invalidOfficerIds = assignedOfficers.filter(
        (officerId) => !officerIdsSet.has(officerId)
      );

      if (invalidOfficerIds.length > 0) {
        return res.status(400).json({
          status: "ERROR",
          message:
            "One or more officer IDs are not valid for this security company.",
        });
      }

      serviceRequest.assignedOfficers = assignedOfficers;
    }

    serviceRequest.requestStatus = status;
    serviceRequest.body = body;

    await serviceRequest.save();

    const fcmTokenDocs: IFcmToken[] = await FcmToken.find({
      userId: serviceRequest.client,
    });

    const tokens = fcmTokenDocs.map((tokenDoc) => tokenDoc.fcmToken);

    await sendNotification(
      tokens,
      "Update on your service request!",
      "There has been an update on your service request, click to view."
    );

    if (serviceRequest.assignedOfficers) {
      const fcmTokens = await FcmToken.find({
        userId: { $in: serviceRequest.assignedOfficers },
      });

      const tokens = fcmTokens.map((tokenDoc) => tokenDoc.fcmToken);

      await sendNotification(
        tokens,
        "Update on service request",
        `A new update on service request you have been assigned, take a look!`
      );

      const officerDetails = await User.find({
        _id: {
          $in: serviceRequest.assignedOfficers,
        },
      }).populate<{ profile: { phone: string } }>({
        path: "profile",
        model: "SecurityOfficer",
        select: "phone",
      });

      officerDetails &&
        officerDetails.forEach(async (officerDetail) => {
          sendEmail({
            to: [officerDetail.email],
            subject: "Update on you service request",
            html: serviceRequestUpdateEmailBody(officerDetail.userName),
          }).catch((err) => {
            console.error("Error sending emails:", err);
          });
        });

      const findClientProfileId = await User.findById(serviceRequest.client);

      if (!findClientProfileId) {
        return res
          .status(404)
          .json({ status: "ERROR", message: "User not found." });
      }
    }

    return res.status(200).json({
      status: "OK",
      message: "Service request updated successfully.",
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

const remove = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { serviceRequestId } = req.params;

    const serviceRequest = await ServiceRequest.findById(serviceRequestId);

    if (!serviceRequest || !serviceRequest.client.equals(req.user?.id)) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Service request not found." });
    }

    if (serviceRequest.client.toString() !== req.user?.id) {
      return res.status(403).json({
        status: "ERROR",
        message: "Unauthorized to delete this service request.",
      });
    }

    serviceRequest.isDeleted = true;
    await serviceRequest.save();

    return res.status(200).json({
      status: "OK",
      message: "Service request deleted successfully.",
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

export const get = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { serviceRequestId } = req.params;

    const serviceRequest = await ServiceRequest.findById(serviceRequestId)
      .populate({
        path: "assignedOfficers",
        model: "User",
        select: "-passwordHash -userId -userName -createdAt -updatedAt",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select:
            "-assignedCompany -assignedBy -isDeleted -createdAt -updatedAt",
        },
      })
      .populate({
        path: "events",
        select: "-raisedBy -serviceRequest",
      })
      .populate({
        path: "securityCompany",
        model: "User",
        select: "-passwordHash -isDeleted -createdAt -updatedAt",
      });

    if (!serviceRequest || serviceRequest.isDeleted) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Service request not found." });
    }

    return res.status(200).json({
      status: "OK",
      serviceRequest,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

export const listClientRequests = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const serviceRequests = await ServiceRequest.find({
      client: req.user?.id,
      isDeleted: false,
    })
      .populate({
        path: "assignedOfficers",
        model: "User",
        select: "-passwordHash -userId -userName -createdAt -updatedAt",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select:
            "-assignedCompany -assignedBy -isDeleted -createdAt -updatedAt",
        },
      })
      .populate({
        path: "securityCompany",
        model: "User",
        select: "email profile",
        populate: {
          path: "profile",
          model: "SecurityCompany",
          select:
            "companyName address psiraNumber contactPerson phone servicesOffered branches",
        },
      });

    return res.status(200).json({
      status: "OK",
      serviceRequests,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

export const listCompanyRequests = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const serviceRequests = await ServiceRequest.find({
      securityCompany: req.user?._id,
      isDeleted: false,
    })
      .populate({
        path: "assignedOfficers",
        model: "User",
        select: "-passwordHash -userId -userName -createdAt -updatedAt",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select:
            "-assignedCompany -assignedBy -isDeleted -createdAt -updatedAt",
        },
      })
      .populate({
        path: "securityCompany",
        model: "User",
        select: "email profile",
        populate: {
          path: "profile",
          model: "SecurityCompany",
          select:
            "companyName address psiraNumber contactPerson phone servicesOffered branches",
        },
      });

    return res.status(200).json({
      status: "OK",
      serviceRequests,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

export const listOfficerRequests = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const serviceRequests = await ServiceRequest.find({
      assignedOfficers: req.user?._id,
      isDeleted: false,
    })
      .populate({
        path: "assignedOfficers",
        model: "User",
        select: "-passwordHash -userId -userName -createdAt -updatedAt",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select:
            "-assignedCompany -assignedBy -isDeleted -createdAt -updatedAt",
        },
      })
      .populate({
        path: "securityCompany",
        model: "User",
        select: "email profile",
        populate: {
          path: "profile",
          model: "SecurityCompany",
          select:
            "companyName address psiraNumber contactPerson phone servicesOffered branches",
        },
      });

    return res.status(200).json({
      status: "OK",
      serviceRequests,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

export const listAllRequests = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const serviceRequests = await ServiceRequest.find()
      .select("-events")
      .populate({
        path: "assignedOfficers",
        model: "User",
        select: "-passwordHash -userId -userName -createdAt -updatedAt",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select:
            "-assignedCompany -assignedBy -isDeleted -createdAt -updatedAt",
        },
      })
      .populate({
        path: "securityCompany",
        model: "User",
        select: "email profile",
        populate: {
          path: "profile",
          model: "SecurityCompany",
          select:
            "companyName address psiraNumber contactPerson phone servicesOffered branches",
        },
      });

    return res.status(200).json({
      status: "OK",
      serviceRequests,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ status: "ERROR", message: error.message });
  }
};

const updateStatus = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const serviceRequestId = req.params.serviceRequestId;
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);

    if (!serviceRequest) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Service request not found" });
    }

    if (
      serviceRequest.assignedOfficers &&
      !serviceRequest.assignedOfficers.includes(userId)
    ) {
      return res.status(403).json({
        status: "ERROR",
        message: "You are not authorized to update this service request",
      });
    }

    serviceRequest.requestStatus = req.body.status;

    await serviceRequest.save();

    return res
      .status(200)
      .json({ status: "OK", message: "Updated service request successfully" });
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      message: "Internal Server Error",
    });
  }
};

export default {
  create,
  update,
  remove,
  get,
  listClientRequests,
  listCompanyRequests,
  listOfficerRequests,
  listAllRequests,
  updateStatus,
};
