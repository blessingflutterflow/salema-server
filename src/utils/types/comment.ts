import mongoose from "mongoose";

export interface IComment extends mongoose.Document {
  client: mongoose.Types.ObjectId;
  body: string;
  isDeleted: boolean;
  missingPerson: mongoose.Types.ObjectId;
}

export interface AddUpdateCommentDto {
  body: string;
  missingPerson: string;
}
