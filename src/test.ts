import mongoose from "mongoose";
import dotenv from "dotenv";
import adminServices from "./services/admin.services"; 
import { Request, Response } from "express";

dotenv.config();

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not defined");

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    const req = {
      body: {
        userName: "adminuser",
        email: "adminuser@example.com",
        password: "securePass123",
      },
    } as Request;

    let res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        console.log("Response:", data);
        return data;
      },
    };

    await adminServices.register(req, res as unknown as Response);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error in test script:", error);
  }
}

main();
