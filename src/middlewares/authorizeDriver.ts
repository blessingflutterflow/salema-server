import { Response, NextFunction } from "express";
import CustomRequest from "../utils/types/express";

const authorizeDriver = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): any => {
  const user = req.user;

  if (user && user.role === "DR") {
    return next();
  }

  return res.status(403).json({
    status: "ERROR",
    message: "Access denied: driver role required",
  });
};

export default authorizeDriver;
