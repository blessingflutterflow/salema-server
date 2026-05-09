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
  serviceRadius: number;
  supportedTiers: ("standard" | "premium" | "presidential")[];
  operatingHours: {
    start: string;
    end: string;
  };
  verificationStatus: "unverified" | "verified" | "declined";
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  psiraGrade?: "A" | "B" | "C" | "D" | "E";
  isArmed?: boolean;
  vehicleType?: "foot" | "bike" | "car";
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
  latitude: number;    
  longitude: number;
}

export interface UpdateCompanyDto {
  companyName?: string;
  address?: string;
  psiraNumber?: string;
  contactPerson?: string;
  phone?: string;
  securityServices?: string[];
  branches?: string[];
  officers?: string[];
  serviceRadius?: number;
  supportedTiers?: ("standard" | "premium" | "presidential")[];
  operatingHours?: {
    start?: string;
    end?: string;
  };
}
