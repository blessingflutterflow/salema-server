import mongoose, { Document } from "mongoose";

export interface IClient extends Document {
  firstName: string;
  surname?: string;
  contact: string;
  address: string;
  isDeleted: boolean;
  securityCompaniesUsed?: mongoose.Types.ObjectId[];
  emergencyContacts?: mongoose.Types.ObjectId[];
}

export interface RegisterClientDto {
  firstName: string;
  surname?: string;
  address?: string;
  contact: string;
  password: string;
  email: string;
}

export interface UpdateClientDto {
  firstName: string;
  surname: string;
  contact: string;
  address: string;
}
