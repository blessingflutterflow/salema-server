import mongoose from "mongoose";

export interface IDangerZone extends mongoose.Document {
  name: string;
  type: "Polygon" | "Circle";
  location?: {
    type: "Polygon";
    coordinates: number[][][];
  };
  center?: {
    type: "Point";
    coordinates: [number, number];
  };
  radius?: number;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
}
