import mongoose, { Schema } from "mongoose";
import { IClient } from "../utils/types/client";

const clientSchema: Schema<IClient> = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: false,
    },
    contact: {
      type: String,
      required: true,
      //unique: true,
    },
    address: { type: String, required: false },
    securityCompaniesUsed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SecurityCompany",
        required: false,
      },
    ],
    emergencyContacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmergencyContact",
        required: false,
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const Client = mongoose.model<IClient>("Client", clientSchema);

export default Client;
