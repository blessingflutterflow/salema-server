import { Types } from "mongoose";

import { IUser } from "./user";
import { IServiceRequest } from "./service-requests";
import { ISecurityCompany } from "./security-company";
import { ISecurityOfficer } from "./security-officer";
import { IClient } from "./client";

export interface IComment {
  _id?: Types.ObjectId;
  comment: string;
  user: Types.ObjectId | IUser | undefined;
  profile:
    | Types.ObjectId
    | ISecurityCompany
    | ISecurityOfficer
    | IClient
    | undefined;
  role: string;
  isDeleted?: boolean;
}

export interface IEvent {
  eventTitle: string;
  eventBody: string;
  comments: IComment[];
  serviceRequest: Types.ObjectId | IServiceRequest;
  raisedBy: Types.ObjectId;
  status: "pending" | "completed";
}

export interface CreateEventDto {
  eventTitle: string;
  eventBody: string;
}
