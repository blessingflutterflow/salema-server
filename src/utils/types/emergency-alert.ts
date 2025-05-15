import mongoose from "mongoose";

export enum AlertType {
  PANIC_BUTTON = "panic_button",
  SHAKE_PHONE = "shake_phone",
  VOICE_COMMAND = "voice_command",
}

export interface ILocation {
  type: "Point";
  coordinates: number[];
}

export interface IEmergencyAlert extends mongoose.Document {
  raisedBy: mongoose.Types.ObjectId;
  raisedToSecurityOfficer: mongoose.Types.ObjectId[];
  raisedToEmergencyContact: mongoose.Types.ObjectId[];
  location: ILocation;
  timestamp: Date;
  alertType: AlertType;
}

export interface AlertDto {
  location: { latitude: number; longitude: number };
  alertType: AlertType;
}

export interface VoiceCommandAlertDto {
  location: { latitude: number; longitude: number };
}
