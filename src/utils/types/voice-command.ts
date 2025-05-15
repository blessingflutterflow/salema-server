import mongoose, { Document } from "mongoose";

export interface IVoiceCommand extends Document {
  client: mongoose.Types.ObjectId;
  text: string;
  type?: string;
  emergencyContact: mongoose.Types.ObjectId;
  isDeleted: boolean;
}

export interface AddUpdateVoiceCommandDto {
  text: string;
  type?: string;
  emergencyContact: mongoose.Types.ObjectId;
}
