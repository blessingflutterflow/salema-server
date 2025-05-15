import { Response } from "express";
import { validationResult } from "express-validator";

import EmergencyContact from "../models/emergency-contact.model";
import Client from "../models/client.model";
import CustomRequest from "../utils/types/express";
import { EmergencyContactDto } from "../utils/types/emergency-contact";

const create = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const clientId = req.user?.profile;
    const { email, name, relationship, phone }: EmergencyContactDto = req.body;

    const newEmergencyContact = new EmergencyContact({
      name,
      relationship,
      phone,
      email,
      voiceCommandText: "",
      client: clientId,
    });

    await newEmergencyContact.save();

    await Client.findByIdAndUpdate(
      clientId,
      { $addToSet: { emergencyContacts: newEmergencyContact._id } },
      { new: true }
    );

    return res.status(201).json({
      status: "OK",
      message: "Emergency contact created successfully.",
    });
  } catch (error) {
    console.error("Error creating emergency contact:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

const list = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.profile;

    const client = await Client.findById(clientId).populate({
      path: "emergencyContacts",
      match: { isDeleted: false },
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    return res.status(200).json({
      status: "OK",
      emergencyContacts: client.emergencyContacts,
    });
  } catch (error) {
    console.error("Error retrieving emergency contacts:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

const remove = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id } = req.params;
    const clientId = req.user?.profile;

    const emergencyContact = await EmergencyContact.findById(id);

    if (
      !emergencyContact ||
      !emergencyContact.client.equals(req.user?.profile)
    ) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Emergency contact not found." });
    }

    if (!emergencyContact.client.equals(clientId)) {
      return res.status(403).json({
        status: "ERROR",
        message:
          "Unauthorized: This emergency contact belongs to someone else!",
      });
    }

    emergencyContact.isDeleted = true;
    await emergencyContact.save();

    return res.status(200).json({
      status: "OK",
      message: "Emergency contact deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting emergency contact:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error." });
  }
};

export default {
  create,
  list,
  remove,
};
