import { Response, NextFunction } from "express";
import CustomRequest from "../utils/types/express";

const authorizeSecurityCompany = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): any => {
  const user = req.user;

  if (user && user.role === "MG" && user.permissions === "03") {
    return next();
  }

  return res.status(403).json({
    status: "ERROR",
    message: "Access denied: insufficient permissions",
  });
};

export default authorizeSecurityCompany;
