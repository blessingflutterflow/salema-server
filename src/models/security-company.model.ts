import mongoose, { Model, Schema } from "mongoose";

import { ISecurityCompany } from "../utils/types/security-company";

const securityCompanySchema: Schema<ISecurityCompany> = new Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    psiraNumber: {
      type: String,
      required: true,
    },
    contactPerson: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    
    servicesOffered: {
      type: [String],
      required: true,
    },
    branches: {
      type: [String],
      required: true,
    },
    officers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SecurityOfficer",
      },
    ],
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "declined"],
      default: "unverified",
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);

const SecurityCompany: Model<ISecurityCompany> =
  mongoose.model<ISecurityCompany>("SecurityCompany", securityCompanySchema);

export default SecurityCompany;
