import mongoose, { Model, Schema } from "mongoose";

export interface IDriver extends mongoose.Document {
  firstName: string;
  lastName: string;
  phone: string;
  idNumber: string;
  licenceNumber: string;
  carMake: string;
  carModel: string;
  carYear: number;
  carColor: string;
  carPlate: string;
  latitude: number;
  longitude: number;
  verificationStatus: "unverified" | "verified" | "declined";
  isDeleted: boolean;
}

const driverSchema: Schema<IDriver> = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    idNumber: { type: String, required: true },
    licenceNumber: { type: String, required: true },
    carMake: { type: String, required: true },
    carModel: { type: String, required: true },
    carYear: { type: Number, required: true },
    carColor: { type: String, required: true },
    carPlate: { type: String, required: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "declined"],
      default: "unverified",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const Driver: Model<IDriver> = mongoose.model<IDriver>("Driver", driverSchema);

export default Driver;
