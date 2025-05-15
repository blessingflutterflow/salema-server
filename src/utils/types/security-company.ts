import mongoose, { Document } from "mongoose";

export interface ISecurityCompany {
  companyName: string;
  address: string;
  isDeleted: boolean;
  psiraNumber: string;
  contactPerson: string;
  phone: string;
  servicesOffered: string[];
  branches: string[];
  officers: mongoose.Types.ObjectId[];
  verificationStatus: "unverified" | "verified" | "declined";
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
}

export interface RegisterCompanyDto {
  companyName: string;
  contactPerson: string;
  phone: string;
  psiraNumber: string;
  email: string;
  address: string;
  password: string;
  branches: string[];
  securityServices: string[];
}

export interface UpdateCompanyDto {
  companyName: string;
  address: string;
  psiraNumber: string;
  contactPerson: string;
  phone: string;
  securityServices: string[];
  branches: string[];
  officers: string[];
}
