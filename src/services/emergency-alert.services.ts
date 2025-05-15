import { Response } from "express";
import { validationResult } from "express-validator";

import CustomRequest from "../utils/types/express";
import EmergencyAlert from "../models/emergency-alert.model";
import { sendEmail } from "../utils/helpers/mailer";
import { emergencyAlertEmailBody } from "../utils/helpers/templates/emergency-alert-template";
import EmergencyContact from "../models/emergency-contact.model";
import Client from "../models/client.model";
import { AlertDto, VoiceCommandAlertDto } from "../utils/types/emergency-alert";
import dayjs from "dayjs";
import User from "../models/user.model";
import FcmToken from "../models/fcmToken.model";
import { sendNotification } from "../utils/helpers/fcm-messager";
import { IFcmToken } from "../utils/types/fcm";
import { Types } from "mongoose";
import ServiceRequest from "../models/service-requests.model";

const create = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { location, alertType }: AlertDto = req.body;

    const raisedBy = req.user?.id;

    const serviceRequests = await ServiceRequest.find({
      client: raisedBy,
    }).populate<{ assignedOfficers: { _id: Types.ObjectId; email: string }[] }>(
      {
        path: "assignedOfficers",
        model: "User",
        select: "_id email",
      }
    );

    const securityOfficerEmail: string[] = [],
      securityOfficerId: Types.ObjectId[] = [];

    serviceRequests.forEach((serviceRequest) => {
      serviceRequest.assignedOfficers.forEach((assignedOfficer) => {
        if (assignedOfficer._id) {
          securityOfficerId.push(assignedOfficer._id);
        }
        if (assignedOfficer.email) {
          securityOfficerEmail.push(assignedOfficer.email);
        }
      });
    });

    const emergencyContacts = await EmergencyContact.find({
      client: req.user?.profile,
    }).select("email relationship ");

    const newEmergencyAlert = new EmergencyAlert({
      raisedBy,
      raisedToSecurityOfficer: securityOfficerId,
      raisedToEmergencyContact: emergencyContacts.map(
        (emergencyContact) => emergencyContact._id
      ),
      location: {
        coordinates: [location.longitude, location.latitude],
        type: "Point",
      },
      alertType,
    });

    await newEmergencyAlert.save();

    const to = [
      ...emergencyContacts.map((item) => item.email),
      ...securityOfficerEmail,
    ];

    const client = await Client.findById(req.user?.profile);

    to.length &&
      sendEmail({
        to,
        subject: "Emergency Alert Notification",
        html: emergencyAlertEmailBody(
          alertType,
          [location.longitude, location.latitude],
          dayjs(new Date()).format("DD MM YYYY, hh:mm A").toString(),
          client ? `${client.firstName} ${client.surname}` : ""
        ),
      }).catch((err) => {
        console.error("Error sending emails:", err);
      });

    const users = await User.find({
      email: { $in: to },
    }).exec();

    let fcmTokens: IFcmToken[] = [];

    if (users) {
      fcmTokens = await FcmToken.find({
        userId: { $in: users.map((user) => user._id) },
      });
    }

    if (fcmTokens.length > 0) {
      const tokens = fcmTokens.map((tokenDoc) => tokenDoc.fcmToken);

      await sendNotification(
        tokens,
        "Emergency Alert",
        "A voice alert has been received from your ally!"
      );
    }

    return res.status(201).json({
      status: "OK",
      message: "Emergency alert created successfully.",
    });
  } catch (error) {
    console.error("Error creating emergency alert:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

const alertContact = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { emergencyContactId } = req.params;

    const { location }: VoiceCommandAlertDto = req.body;

    const raisedBy = req.user?.id;

    const emergencyContact = await EmergencyContact.findById(emergencyContactId)
      .select("email")
      .exec();

    if (!emergencyContact) {
      return res
        .status(400)
        .json({ status: "OK", message: "Emergency contact not found" });
    }

    const serviceRequests = await ServiceRequest.find({
      client: raisedBy,
    }).populate<{ assignedOfficers: { _id: Types.ObjectId; email: string }[] }>(
      {
        path: "assignedOfficers",
        model: "User",
        select: "_id email",
      }
    );

    const securityOfficerEmail: string[] = [],
      securityOfficerId: Types.ObjectId[] = [];

    serviceRequests.forEach((serviceRequest) => {
      serviceRequest.assignedOfficers.forEach((assignedOfficer) => {
        if (assignedOfficer._id) {
          securityOfficerId.push(assignedOfficer._id);
        }
        if (assignedOfficer.email) {
          securityOfficerEmail.push(assignedOfficer.email);
        }
      });
    });

    const newEmergencyAlert = new EmergencyAlert({
      raisedBy,
      raisedToSecurityOfficer:
        securityOfficerId.length > 0 ? securityOfficerId : [],
      raisedToEmergencyContact: [emergencyContactId],
      location: {
        coordinates: [location.longitude, location.latitude],
        type: "Point",
      },
      alertType: "voice_command",
    });

    await newEmergencyAlert.save();

    const client = await Client.findById(req.user?.profile);

    emergencyContact &&
      sendEmail({
        to: [emergencyContact?.email, ...securityOfficerEmail],
        subject: "Emergency Alert Notification",
        html: emergencyAlertEmailBody(
          "voice_command",
          [location.longitude, location.latitude],
          dayjs(new Date()).format("DD MM YYYY, hh:mm A").toString(),
          client ? `${client.firstName} ${client.surname}` : ""
        ),
      }).catch((err) => {
        console.error("Error sending emails:", err);
      });

    const users = await User.find({
      email: { $in: [emergencyContact.email, ...securityOfficerEmail] },
    }).exec();

    let fcmTokens: IFcmToken[] = [];

    if (users) {
      fcmTokens = await FcmToken.find({
        userId: { $in: users.map((user) => user._id) },
      });
    }

    if (fcmTokens.length > 0) {
      const tokens = fcmTokens.map((tokenDoc) => tokenDoc.fcmToken);

      await sendNotification(
        tokens,
        "Emergency Alert",
        "A voice alert has been received from your ally!"
      );
    }

    return res.status(201).json({
      status: "OK",
      message: "Emergency alert created successfully.",
    });
  } catch (error) {
    console.error("Error creating emergency alert:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

const listMyAlerts = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;

    const emergencyAlerts = await EmergencyAlert.find({
      raisedBy: userId,
    })
      .populate({
        path: "raisedToSecurityOfficer",
        model: "User",
        select: "_id userName userId email profile",
        populate: {
          path: "profile",
          model: "SecurityOfficer",
          select: "psiraNumber phone",
        },
      })
      .populate({
        path: "raisedToEmergencyContact",
        model: "EmergencyContact",
        select: "_id name relationship phone email",
      })
      .select("-raisedBy")
      .sort({ timestamp: -1 });

    return res.status(200).json({ status: "OK", emergencyAlerts });
  } catch (error) {
    console.error("Error on listing alerts: ", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Internal Server Error",
    });
  }
};

const listAssignedAlerts = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;

    const emergencyAlerts = await EmergencyAlert.find({
      raisedToSecurityOfficer: { $in: userId },
    })
      .populate({
        path: "raisedBy",
        model: "User",
        select: "_id userName userId email profile",
        populate: {
          path: "profile",
          model: "Client",
          select: "contact",
        },
      })
      .select("-raisedToSecurityOfficer -raisedToEmergencyContact")
      .sort({ timestamp: -1 });

    return res.status(200).json({ status: "OK", emergencyAlerts });
  } catch (error) {
    console.error("Error on listing alerts: ", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal Server Error",
    });
  }
};

const listAllAlerts = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const emergencyAlerts = await EmergencyAlert.find()
      .populate({
        path: "raisedBy",
        model: "User",
        select: "-passwordHash -userId -userName -createdAt -updatedAt",
        populate: {
          path: "profile",
          select: "-securityCompaniesUsed -emergencyContacts",
          model: "Client",
        },
      })
      .sort({ timestamp: -1 });

    return res.status(200).json({ status: "OK", emergencyAlerts });
  } catch (error) {
    console.error("Error on listing alerts: ", error);

    return res.status(500).json({
      status: "ERROR",
      message: "Internal Server Error",
    });
  }
};

export default {
  create,
  listMyAlerts,
  listAssignedAlerts,
  listAllAlerts,
  alertContact,
};
