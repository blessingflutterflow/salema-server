import mongoose, { Model, Schema } from "mongoose";
import { IMissingPerson } from "../utils/types/missing-person";

const missingPersonSchema: Schema<IMissingPerson> = new Schema(
  {
    client: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Clients",
    },
    filepath: {
      type: String,
      required: true,
    },
    personName: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    lastSeenDateTime: {
      type: Date,
      required: false,
    },
    lastSeenLocation: {
      type: String,
      required: false,
    },
    contact: {
      type: String,
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
    missingStatus: { type: String, enum: ["missing", "found"] },
    comments: {
      type: [String],
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const MissingPerson: Model<IMissingPerson> = mongoose.model<IMissingPerson>(
  "MissingPerson",
  missingPersonSchema
);

export default MissingPerson;
