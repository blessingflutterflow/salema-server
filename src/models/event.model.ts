import { Schema, model, Document, Types } from "mongoose";

import { IComment } from "../utils/types/comment";
import { IEvent } from "../utils/types/event";

const CommentSchema = new Schema(
  {
    comment: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profile: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "comments.role",
    },
    role: {
      type: String,
      enum: ["Admin", "Client", "SecurityCompany", "SecurityOfficer"],
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);

const EventSchema = new Schema<IEvent>(
  {
    eventTitle: { type: String, required: true },
    eventBody: { type: String, required: true },
    comments: [CommentSchema],
    serviceRequest: {
      type: Schema.Types.ObjectId,
      ref: "ServiceRequest",
      required: true,
    },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
  },
  { timestamps: true, versionKey: false }
);

const Event = model<IEvent>("Event", EventSchema);

export default Event;
