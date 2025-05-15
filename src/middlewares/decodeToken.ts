import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import User from "../models/user.model";
import CustomRequest from "../utils/types/express";

const decodeToken = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ status: "ERROR", message: "Access denied. No token provided." });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

    // const model =
    //   decoded.role === "GU"
    //     ? "Client"
    //     : decoded.role === "MG"
    //     ? "SecurityCompany"
    //     : decoded.role === "SO"
    //     ? "SecurityOfficer"
    //     : undefined;

    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Invalid token:", error);
    return res.status(401).json({ status: "ERROR", message: "Invalid token." });
  }
};

export default decodeToken;
