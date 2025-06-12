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

router.post("/forgot-password", body("email").isEmail(), userServices.forgotPassword);

router.post(
  "/reset-with-token",
  body("email").isEmail(),
  body("token").notEmpty(),
  body("newPassword").isLength({ min: 6 }),
  userServices.resetWithToken
);




export default router;
