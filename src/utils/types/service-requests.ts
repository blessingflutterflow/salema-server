import mongoose from "mongoose";

export interface IServiceRequest extends mongoose.Document {
  client: mongoose.Types.ObjectId;
  securityCompany: mongoose.Types.ObjectId;
  requestedServices: string[];
  requestedDateTime: Date;
  assignedOfficers?: mongoose.Types.ObjectId[];
  requestNumber: string;
  requestStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "in-progress"
    | "completed";
  paymentId?: mongoose.Types.ObjectId;
  priority?: "high" | "medium" | "low";
  isDeleted: boolean;
  body?: string;
  location?: { coordinates: ICoordinates };
  events: mongoose.Types.ObjectId[];
  // Vehicle escort fields
  escortTier?: "general" | "standard" | "premium" | "presidential";
  numVehicles?: number;
  isArmed?: boolean;
  price?: number;
  destination?: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
}

interface ICoordinates {
  latitude: string;
  longitude: string;
}

export interface CreateRequestDto {
  requestedServices: string[];
  requestedDateTime: Date;
  priority: "high" | "medium" | "low";
  location: {
    latitude: string | number;
    longitude: string | number;
  };
  body: string;
}

export interface UpdateRequestDto {
  serviceRequestId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected" | "in-progress" | "completed";
  assignedOfficers: mongoose.Types.ObjectId[];
  body: string;
}
