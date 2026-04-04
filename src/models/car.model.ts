import mongoose, { Model, Schema } from "mongoose";

export interface ICar {
  plate: string;
  model: string;
  type: "sedan" | "suv" | "van" | "bakkie";
  year: number;
  companyId: mongoose.Types.ObjectId;
  available: boolean;
  isDeleted: boolean;
}

const carSchema: Schema<ICar> = new Schema(
  {
    plate: { type: String, required: true, unique: true },
    model: { type: String, required: true },
    type: { type: String, enum: ["sedan", "suv", "van", "bakkie"], required: true },
    year: { type: Number, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "SecurityCompany", required: true },
    available: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const Car: Model<ICar> = mongoose.model<ICar>("Car", carSchema);
export default Car;
