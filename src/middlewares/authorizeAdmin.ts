import { Response, NextFunction } from "express";
import CustomRequest from "../utils/types/express";

const authorizeAdmin = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): any => {
  const user = req.user;

  if (user && user.role === "AD" && user.permissions === "01") {
    return next();
  }

  return res.status(403).json({
    status: "ERROR",
    message: "Access denied: insufficient permissions",
  });
};

export default authorizeAdmin;
