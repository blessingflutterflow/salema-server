import mongoose, { Schema } from "mongoose";
import { IEmergencyContact } from "../utils/types/emergency-contact";

const emergencyContactSchema: Schema<IEmergencyContact> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    relationship: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    voiceCommandText: {
      type: String,
      required: false,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    securityOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecurityOfficer",
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);

const EmergencyContact = mongoose.model<IEmergencyContact>(
  "EmergencyContact",
  emergencyContactSchema
);

export default EmergencyContact;
