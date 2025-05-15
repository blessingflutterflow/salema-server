import mongoose, { Document, Schema } from "mongoose";
import { IDangerZone } from "../utils/types/danger-zone";

const dangerZoneSchema = new Schema<IDangerZone>({
  name: { type: String, required: true },
  type: { type: String, enum: ["Polygon", "Circle"], required: true },
  location: {
    type: { type: String, enum: ["Polygon"], required: false },
    coordinates: {
      type: [[[Number]]],
      required: function (this: IDangerZone) {
        return this.type === "Polygon";
      },
    },
  },
  center: {
    type: {
      type: String,
      enum: ["Point"],
      required: function (this: IDangerZone) {
        return this.type === "Circle";
      },
    },
    coordinates: {
      type: [Number],
      required: function (this: IDangerZone) {
        return this.type === "Circle";
      },
    },
  },
  radius: {
    type: Number,
    required: function (this: IDangerZone) {
      return this.type === "Circle";
    },
    min: [0, "Radius must be a positive number"],
    max: [5000, "Radius must not exceed 5000"],
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

dangerZoneSchema.index({ location: "2dsphere" });
dangerZoneSchema.index({ center: "2dsphere" });

const DangerZone = mongoose.model<IDangerZone>("DangerZone", dangerZoneSchema);
export default DangerZone;
