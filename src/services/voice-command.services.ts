import { Response } from "express";
import { validationResult } from "express-validator";

import { AddUpdateVoiceCommandDto } from "../utils/types/voice-command";
import VoiceCommand from "../models/voice-command.modal";
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
      return res.status(401).json({ status: "ERROR", message: "Unauthorized: User not found." });
    }

    const { text, type }: AddUpdateVoiceCommandDto = req.body;

    const voiceCommand = new VoiceCommand({
      client: user.id,
      text,
      type,
      emergencyContact: null, // Always null since no emergency contact
      isDeleted: false,
    });

    await voiceCommand.save();

    return res.status(201).json({
      status: "OK",
      message: "Voice command added successfully.",
      data: voiceCommand,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

//save recording
const saveRecording = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "ERROR", errors: errors.array() });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: "ERROR", message: "Unauthorized: User not found." });
    }

    const { phrase } = req.body;
    if (!phrase || typeof phrase !== "string") {
      return res.status(400).json({ status: "ERROR", message: "Phrase is required and must be a string." });
    }

    const newRecording = new VoiceCommand({
      client: user.id,
      text: phrase,
      type: "recording",
      emergencyContact: null,
      isDeleted: false,
    });

    await newRecording.save();

    return res.status(201).json({
      status: "OK",
      message: "Phrase saved successfully.",
      data: newRecording,
    });
  } catch (error: any) {
    console.error("saveRecording error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

//get recording
const getVoiceCommandsForCurrentClient = async (
  req: CustomRequest,
  res: Response
): Promise<any> => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        status: "ERROR",
        message: "Unauthorized: User not found.",
      });
    }

    const voiceCommands = await VoiceCommand.find({
      client: user.id,
      isDeleted: false,
    }).select("text type");

    return res.status(200).json({
      status: "OK",
      voiceCommands,
    });
  } catch (error: any) {
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
      client: user?.id,
      isDeleted: false,
    }).select("text type emergencyContact"); // emergencyContact will always be null

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

    if (!updatedVoiceCommand || !updatedVoiceCommand.client.equals(req.user?.id)) {
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

    // 🔍 Debug logs to trace mismatch
    console.log('💥 VoiceCommand.client:', updatedVoiceCommand?.client?.toString());
    console.log('🔐 req.user.id:', req.user?.id);

    if (!updatedVoiceCommand || !updatedVoiceCommand.client.equals(req.user?.id)) {
      return res.status(404).json({
        status: "ERROR",
        message: "Voice command details not found.",
      });
    }

    return res.status(200).json({ status: "OK", message: "Deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message || "Internal server error.",
    });
  }
};

const hardDeleteVoiceCommand = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ status: "ERROR", message: "Unauthorized: User not found." });
    }

    const deleted = await VoiceCommand.findOneAndDelete({
      _id: id,
      client: user.id,
    });

    if (!deleted) {
      return res.status(404).json({ status: "ERROR", message: "Voice command not found or unauthorized." });
    }

    return res.status(200).json({ status: "OK", message: "Voice command permanently deleted." });
  } catch (error: any) {
    console.error("hardDeleteVoiceCommand error:", error);
    return res.status(500).json({ status: "ERROR", message: error.message || "Internal server error." });
  }
};



export default {
  addVoiceCommand,
  listVoiceCommands,
  updateVoiceCommand,
  deleteVoiceCommand,
  saveRecording,
  getVoiceCommandsForCurrentClient,
  hardDeleteVoiceCommand,
};
