import express from "express";
import { body } from "express-validator";

import userServices from "../services/user.services";
import decodeToken from "../middlewares/decodeToken";

const router = express.Router();

router.post(
  "/login",
  body("email").isEmail().withMessage("Invalid email format."),
  body("password").notEmpty().withMessage("Password is required."),
  userServices.login
);

router.post(
  "/forgot-password",
  body("email").isEmail().withMessage("A valid email is required."),
  userServices.forgotPassword
);

router.post(
  "/set-new-password",
  body("token").notEmpty().withMessage("Token is required."),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  userServices.setNewPassword
);

router.post(
  "/reset-password",
  decodeToken,
  body("oldPassword").notEmpty().withMessage("Old password is required."),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long."),
  userServices.resetPassword
);

export default router;
