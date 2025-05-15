import express from "express";
import { body } from "express-validator";

import decodeToken from "../middlewares/decodeToken";
import authorizeSecurityOfficer from "../middlewares/authorizeSecurityOfficer";
import securityOfficerServices from "../services/security-officer.services";

const router = express.Router();

router.get(
  "/my-profile",
  decodeToken,
  authorizeSecurityOfficer,
  securityOfficerServices.myProfile
);

router.put(
  "/my-profile",
  body("firstName")
    .isString()
    .withMessage("First name must be a string.")
    .notEmpty()
    .withMessage("First name is required."),

  body("lastName")
    .isString()
    .withMessage("Last name must be a string.")
    .notEmpty()
    .withMessage("Last name is required."),

  body("psiraNumber")
    .isString()
    .withMessage("PSIRA number must be a string.")
    .notEmpty()
    .withMessage("PSIRA number is required."),

  body("phone")
    .isString()
    .withMessage("Phone must be a string.")
    .notEmpty()
    .withMessage("Phone is required.")
    .withMessage("Phone must be a valid mobile number."),

  body("availabilityStatus")
    .isIn(["available", "unavailable", "on-duty"])
    .withMessage(
      "Availability status must be one of: available, unavailable, on-duty."
    ),

  body("skills")
    .isArray()
    .withMessage("Skills must be an array of strings.")
    .notEmpty()
    .withMessage("Skills are required.")
    .custom((value) => {
      value.forEach((item: string) => {
        if (typeof item !== "string") {
          throw new Error("Each skill must be a string.");
        }
      });
      return true;
    }),

  body("experienceYears")
    .isInt({ min: 0 })
    .withMessage("Experience years must be a non-negative integer.")
    .notEmpty()
    .withMessage("Experience years are required."),

  decodeToken,
  authorizeSecurityOfficer,
  securityOfficerServices.updateProfile
);

export default router;
