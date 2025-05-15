import mongoose from "mongoose";

export interface IEmergencyContact extends mongoose.Document {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  voiceCommandText: string;
  client: mongoose.Types.ObjectId;
  securityOfficer: mongoose.Types.ObjectId;
  isDeleted: boolean;
  _id: mongoose.Types.ObjectId;
}

export interface EmergencyContactDto {
  email: string;
  name: string;
  relationship: string;
  phone: string;
}
