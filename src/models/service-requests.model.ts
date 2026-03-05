import mongoose, { Schema } from "mongoose";

import { IServiceRequest } from "../utils/types/service-requests";

const serviceRequestSchema: Schema<IServiceRequest> = new Schema(
  {
    client: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    securityCompany: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "SecurityCompanies",
    },
    requestNumber: { type: String, required: true, unique: true },
    requestedServices: {
      type: [String],
      required: true,
    },
    requestedDateTime: {
      type: Date,
      required: true,
    },
    assignedOfficers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    requestStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "in-progress", "completed"],
      required: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payments",
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    isDeleted: { type: Boolean, default: false },
    body: {
      type: String,
    },
    events: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    location: {
      coordinates: {
        latitude: {
          type: Number,
          required: true,
        },
        longitude: {
          type: Number,
          required: true,
        },
      },
    },
    // Vehicle escort fields
    escortTier: {
      type: String,
      enum: ["general", "standard", "premium", "presidential"],
    },
    numVehicles: { type: Number },
    isArmed: { type: Boolean },
    price: { type: Number },
    destination: { type: String },
    driverLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      updatedAt: { type: Date },
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const ServiceRequest = mongoose.model<IServiceRequest>(
  "ServiceRequest",
  serviceRequestSchema
);
export default ServiceRequest;
