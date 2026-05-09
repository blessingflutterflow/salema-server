import mongoose, { Model, Schema } from "mongoose";

export interface IGuard {
  firstName: string;
  lastName: string;
  psiraNumber: string;
  phone: string;
  email: string;
  badgeNumber: string;
  photoUrl?: string;
  companyId: mongoose.Types.ObjectId;
  fcmToken?: string;
  grade: "A" | "B" | "C" | "D" | "E";
  isArmed: boolean;
  vehicleType: "foot" | "bike" | "car";
  isTacticalTrained: boolean;
  available: boolean;   // true = online and free
  isOnline: boolean;
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  rating: number;
  totalTrips: number;
  isDeleted: boolean;
}

const guardSchema: Schema<IGuard> = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    psiraNumber: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    badgeNumber: { type: String, required: true },
    photoUrl: { type: String },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "SecurityCompany", required: true },
    fcmToken: { type: String },
    grade: { type: String, enum: ["A", "B", "C", "D", "E"], required: true },
    isArmed: { type: Boolean, default: false },
    vehicleType: { type: String, enum: ["foot", "bike", "car"], default: "foot" },
    isTacticalTrained: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    lastLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      timestamp: { type: Date },
    },
    rating: { type: Number, default: 0 },
    totalTrips: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const Guard: Model<IGuard> = mongoose.model<IGuard>("SecurityOfficer", guardSchema);
export default Guard;
