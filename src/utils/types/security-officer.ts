import mongoose, { Document } from "mongoose";

export interface ISecurityOfficer {
  firstName: string;
  lastName: string;
  psiraNumber: string;
  phone: string;
  assignedCompany: mongoose.Types.ObjectId;
  availabilityStatus: "available" | "unavailable" | "on-duty";
  skills: string[];
  experienceYears: number;
  assignedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  grade: "A" | "B" | "C" | "D" | "E";
}

export interface RegisterOfficerDto {
  firstName: string;
  lastName: string;
  psiraNumber: string;
  phone: string;
  availabilityStatus: "available" | "unavailable" | "on-duty";
  skills: string[];
  experienceYears: number;
  email: string;
  password: string;
  grade: "A" | "B" | "C" | "D" | "E";
}

export interface UpdateOfficerDto {
  firstName: string;
  lastName: string;
  psiraNumber: string;
  phone: string;
  availabilityStatus: "available" | "unavailable" | "on-duty";
  skills: string[];
  experienceYears: number;
}
