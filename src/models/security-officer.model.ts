import mongoose, { Model, Schema } from "mongoose";

export interface IGuard {
  firstName: string;
  lastName: string;
  psiraNumber: string;
  pin: string; // hashed PIN for guard login
  companyId: mongoose.Types.ObjectId;
  fcmToken?: string;
  available: boolean;   // true = online and free
  isOnline: boolean;
  isDeleted: boolean;
}

const guardSchema: Schema<IGuard> = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    psiraNumber: { type: String, required: true },
    pin: { type: String, required: true }, // company sets a 4-digit PIN
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "SecurityCompany", required: true },
    fcmToken: { type: String },
    available: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const Guard: Model<IGuard> = mongoose.model<IGuard>("SecurityOfficer", guardSchema);
export default Guard;
