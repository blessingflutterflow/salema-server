import mongoose, { Model, Schema } from "mongoose";
import { IVoiceCommand } from "../utils/types/voice-command";

const voiceCommandSchema: Schema<IVoiceCommand> = new Schema(
  {
    client: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Clients",
    },
    text: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: false,
    },
    emergencyContact: {
      type: Schema.Types.ObjectId,
      required: false,   // <-- optional now
      ref: "EmergencyContact",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const VoiceCommand: Model<IVoiceCommand> = mongoose.model<IVoiceCommand>(
  "VoiceCommand",
  voiceCommandSchema
);

export default VoiceCommand;
