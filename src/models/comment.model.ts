import mongoose, { Schema } from "mongoose";
import { IComment } from "../utils/types/comment";

const commentSchema: Schema<IComment> = new Schema(
  {
    client: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Clients",
    },
    body: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    missingPerson: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "MissingPersons",
    },
  },
  { timestamps: true, versionKey: false }
);

const Comment = mongoose.model<IComment>("Comment", commentSchema);

export default Comment;
