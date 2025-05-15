import mongoose, { Schema } from "mongoose";
import { AlertType, IEmergencyAlert } from "../utils/types/emergency-alert";

const emergencyAlertSchema: Schema<IEmergencyAlert> = new Schema(
  {
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    raisedToSecurityOfficer: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: false,
    },
    raisedToEmergencyContact: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "EmergencyContact" }],
      required: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], //longitude, latitude
        required: true,
        index: "2dsphere",
      },
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    alertType: {
      type: String,
      enum: Object.values(AlertType),
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

emergencyAlertSchema.index({ location: "2dsphere" });

const EmergencyAlert = mongoose.model<IEmergencyAlert>(
  "EmergencyAlerts",
  emergencyAlertSchema
);

export default EmergencyAlert;
