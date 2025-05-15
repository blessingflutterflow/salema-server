import mongoose, { Model, Schema } from "mongoose";

import { ISecurityOfficer } from "../utils/types/security-officer";

const securityOfficerSchema: Schema<ISecurityOfficer> = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    psiraNumber: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    assignedCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecurityCompany",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "unavailable", "on-duty"],
      required: true,
    },
    skills: {
      type: [String],
      required: true,
    },
    experienceYears: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      enum: ["A", "B", "C", "D", "E"],
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const SecurityOfficer: Model<ISecurityOfficer> =
  mongoose.model<ISecurityOfficer>("SecurityOfficer", securityOfficerSchema);

export default SecurityOfficer;
