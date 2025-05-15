import mongoose, { Document } from "mongoose";

export interface IMissingPerson extends Document {
  client: mongoose.Types.ObjectId;
  filepath: string;
  personName: string;
  age: number;
  lastSeenDateTime: Date;
  lastSeenLocation: string;
  contact: string;
  isDeleted: boolean;
  comments: string[];
  missingStatus: "missing" | "found";
}

export interface AddMissingPersonDto {
  personName: string;
  age: number;
  lastSeenDateTime?: Date;
  lastSeenLocation?: string;
  contact: string;
}

export interface UpdateMissingPersonDto {
  lastSeenDateTime?: Date;
  lastSeenLocation?: string;
  missingStatus: "missing" | "found";
}
