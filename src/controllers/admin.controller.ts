import express from "express";
import { body } from "express-validator";

import adminServices from "../services/admin.services";

const router = express.Router();

router.post(
  "/register",
  body("userName")
    .notEmpty()
    .withMessage("User name is required.")
    .isLength({ min: 3 })
    .withMessage("User name must be at least 3 characters long."),

  body("email")
    .isEmail()
    .withMessage("Invalid email format.")
    .notEmpty()
    .withMessage("Email is required."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
  adminServices.register
);

export default router;
