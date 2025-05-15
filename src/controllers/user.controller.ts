import express from "express";
import { body } from "express-validator";

import userServices from "../services/user.services";
import decodeToken from "../middlewares/decodeToken";

const router = express.Router();

router.post(
  "/login",
  body("email")
    .isEmail()
    .withMessage("Invalid email format.")
    .notEmpty()
    .withMessage("Email is required."),

  body("password").notEmpty().withMessage("Password is required."),
  userServices.login
);

router.post(
  "/reset-password",
  body("oldPassword").notEmpty().withMessage("Old password is required."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long."),
  decodeToken,
  userServices.resetPassword
);

export default router;
