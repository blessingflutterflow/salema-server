import mongoose, { Document } from "mongoose";

export interface ISecurityOfficer {
  firstName: string;
  lastName: string;
  psiraNumber: string;
  phone: string;
  email: string;
  badgeNumber: string;
  photoUrl?: string;
  companyId: mongoose.Types.ObjectId;
  grade: "A" | "B" | "C" | "D" | "E";
  isArmed: boolean;
  vehicleType: "foot" | "bike" | "car";
  isTacticalTrained: boolean;
  available: boolean;
  isOnline: boolean;
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  rating: number;
  totalTrips: number;
  isDeleted: boolean;
}

export interface RegisterOfficerDto {
  firstName: string;
  lastName: string;
  psiraNumber: string;
  phone: string;
  email: string;
  badgeNumber: string;
  password: string;
  grade: "A" | "B" | "C" | "D" | "E";
  isArmed: boolean;
  vehicleType: "foot" | "bike" | "car";
  isTacticalTrained?: boolean;
}

export interface UpdateOfficerDto {
  firstName?: string;
  lastName?: string;
  psiraNumber?: string;
  phone?: string;
  badgeNumber?: string;
  grade?: "A" | "B" | "C" | "D" | "E";
  isArmed?: boolean;
  vehicleType?: "foot" | "bike" | "car";
  isTacticalTrained?: boolean;
  available?: boolean;
  isOnline?: boolean;
}
