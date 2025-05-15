import { Response } from "express";
import { validationResult } from "express-validator";

import { AddUpdateVoiceCommandDto } from "../utils/types/voice-command";
import VoiceCommand from "../models/voice-command.modal";
import EmergencyContact from "../models/emergency-contact.model";
import CustomRequest from "../utils/types/express";

const addVoiceCommand = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Unauthorized: User not found." });
    }

    const { text, type, emergencyContact }: AddUpdateVoiceCommandDto = req.body;

    const findEmergencyContact = await EmergencyContact.findById(
      emergencyContact
    );

    if (!findEmergencyContact) {
      return res.status(404).json({
        status: "ERROR",
        message: "Emergency contact not found.",
      });
    }

    let existingVoiceCommand = await VoiceCommand.findOne({ emergencyContact });

    if (existingVoiceCommand) {
      return res.status(401).json({
        status: "ERROR",
        message: "Voice command already added to this emergency contact.",
      });
    }

    const voiceCommand = new VoiceCommand({
      client: user.id,
      text,
      type,
      emergencyContact,
      isDeleted: false,
    });

    await voiceCommand.save();

    let updateEmergencyContact = await EmergencyContact.findByIdAndUpdate(
      emergencyContact,
      { voiceCommandText: text },
      { new: true, runValidators: true }
    );

    await updateEmergencyContact?.save();

    return res.status(201).json({
      status: "OK",
      message: "Voice command added successfully.",
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const listVoiceCommands = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const user = req.user;

    const voiceCommands = await VoiceCommand.find({
      client: user,
      isDeleted: false,
    })
      .select("text type emergencyContact")
      .populate({
        path: "emergencyContact",
        model: "EmergencyContact",
        select: "-updatedAt -createdAt -isDeleted -client",
      });

    return res.status(200).json({ status: "OK", voiceCommands });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const updateVoiceCommand = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { text, type }: AddUpdateVoiceCommandDto = req.body;

    const updatedVoiceCommand = await VoiceCommand.findByIdAndUpdate(
      req.params.id,
      { text, type },
      { new: true, runValidators: true }
    );

    let updateEmergencyContact = await EmergencyContact.findByIdAndUpdate(
      updatedVoiceCommand?.emergencyContact,
      { voiceCommandText: text },
      { new: true, runValidators: true }
    );

    await updateEmergencyContact?.save();

    if (
      !updatedVoiceCommand ||
      !updatedVoiceCommand.client.equals(req.user?.id)
    ) {
      return res.status(404).json({ message: "Voice command not found." });
    }

    return res.status(200).json({
      status: "OK",
      message: "Voice command updated successfully.",
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const deleteVoiceCommand = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const { id: voiceCommandId } = req.params;

    const updatedVoiceCommand = await VoiceCommand.findByIdAndUpdate(
      voiceCommandId,
      { isDeleted: true },
      { new: true, runValidators: true }
    );

    if (
      !updatedVoiceCommand ||
      !updatedVoiceCommand.client.equals(req.user?.id)
    ) {
      return res.status(404).json({
        status: "ERROR",
        message: "Voice command details not found.",
      });
    }

    let updateEmergencyContact = await EmergencyContact.findByIdAndUpdate(
      updatedVoiceCommand?.emergencyContact,
      { voiceCommandText: "" },
      { new: true, runValidators: true }
    );

    await updateEmergencyContact?.save();

    return res
      .status(200)
      .json({ status: "OK", message: "Deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

export default {
  addVoiceCommand,
  listVoiceCommands,
  updateVoiceCommand,
  deleteVoiceCommand,
};
