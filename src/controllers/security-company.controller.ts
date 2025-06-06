import express from "express";
import { body, param } from "express-validator";

import securityCompanyServices from "../services/security-company.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeAdmin from "../middlewares/authorizeAdmin";
import authorizeSecurityCompany from "../middlewares/authorizeSecurityCompany";
import authorizeClient from "../middlewares/authorizeClient";

const router = express.Router();

router.post(
  "/register",
  body("companyName")
    .isString()
    .notEmpty()
    .withMessage("Company name is required"),

  body("contactPerson")
    .isString()
    .notEmpty()
    .withMessage("Contact person is required"),

  body("phone").isString().notEmpty().withMessage("phone is required"),

  body("psiraNumber")
    .isString()
    .notEmpty()
    .withMessage("PSIRA number is required"),

  body("email").isEmail().withMessage("A valid email is required"),

  body("address").isString().notEmpty().withMessage("Address is required"),

  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("branches")
    .isArray()
    .withMessage("Branches must be an array")
    .custom((value) => {
      if (!value.every((branch: any) => typeof branch === "string")) {
        throw new Error("Each branch must be a string");
      }
      return true;
    }),

  body("securityServices")
    .isArray()
    .withMessage("Security services must be an array")
    .custom((value) => {
      if (!value.every((service: any) => typeof service === "string")) {
        throw new Error("Each security service must be a string");
      }
      return true;
    }),
  securityCompanyServices.register
);

router.get(
  "/verify/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  decodeToken,
  authorizeAdmin,
  securityCompanyServices.verify
);

router.get(
  "/decline/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  decodeToken,
  authorizeAdmin,
  securityCompanyServices.decline
);

router.get(
  "/officers",
  decodeToken,
  authorizeSecurityCompany,
  securityCompanyServices.listOfficers
);

router.post(
  "/add-officer",
  body("firstName")
    .isString()
    .withMessage("First name is required and must be a string.")
    .notEmpty()
    .withMessage("First name cannot be empty."),

  body("lastName")
    .isString()
    .withMessage("Last name is required and must be a string.")
    .notEmpty()
    .withMessage("Last name cannot be empty."),

  body("psiraNumber")
    .isString()
    .withMessage("PSIRA number is required and must be a string.")
    .notEmpty()
    .withMessage("PSIRA number cannot be empty."),

  body("phone")
    .isString()
    .withMessage("Phone number is required and must be a string.")
    .notEmpty()
    .withMessage("Phone number cannot be empty."),

  body("availabilityStatus")
    .isIn(["available", "unavailable", "on-duty"])
    .withMessage(
      "Availability status must be one of: available, unavailable, on-duty."
    ),

  body("skills")
    .isArray()
    .withMessage("Skills must be an array.")
    .notEmpty()
    .withMessage("Skills cannot be empty."),

  body("experienceYears")
    .isInt({ min: 0 })
    .withMessage("Experience years must be a non-negative integer."),

  body("email")
    .isEmail()
    .withMessage("A valid email is required.")
    .notEmpty()
    .withMessage("Email cannot be empty."),

  body("password")
    .isString()
    .withMessage("Password is required and must be a string.")
    .notEmpty()
    .withMessage("Password cannot be empty."),
  body("grade")
    .isIn(["A", "B", "C", "D", "E"])
    .withMessage("Grade must be one of the following: A, B, C, D, or E"),
  decodeToken,
  authorizeSecurityCompany,
  securityCompanyServices.addOfficer
);

router.get(
  "/list",
  decodeToken,
  authorizeClient,
  securityCompanyServices.listCompanies
);

router.get(
  "/list-all",
  decodeToken,
  authorizeAdmin,
  securityCompanyServices.listAll
);

router.get(
  "/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  decodeToken,
  securityCompanyServices.getCompanyProfile
);

router.put(
  "/",
  body("companyName")
    .isString()
    .withMessage("Company name must be a string.")
    .notEmpty()
    .withMessage("Company name is required."),

  body("address")
    .isString()
    .withMessage("Address must be a string.")
    .notEmpty()
    .withMessage("Address is required."),

  body("psiraNumber")
    .isString()
    .withMessage("PSIRA number must be a string.")
    .notEmpty()
    .withMessage("PSIRA number is required."),

  body("contactPerson")
    .isString()
    .withMessage("Contact person must be a string.")
    .notEmpty()
    .withMessage("Contact person is required."),

  body("phone")
    .isString()
    .withMessage("Phone must be a string.")
    .notEmpty()
    .withMessage("Phone is required.")
    .withMessage("Phone must be a valid mobile number."),

  body("securityServices")
    .isArray()
    .withMessage("Services offered must be an array of strings.")
    .notEmpty()
    .withMessage("Services offered is required.")
    .custom((value) => {
      value.forEach((item: string) => {
        if (typeof item !== "string") {
          throw new Error("Each service must be a string.");
        }
      });
      return true;
    }),

  body("branches")
    .isArray()
    .withMessage("Branches must be an array of strings.")
    .notEmpty()
    .withMessage("Branches is required.")
    .custom((value) => {
      value.forEach((item: string) => {
        if (typeof item !== "string") {
          throw new Error("Each branch must be a string.");
        }
      });
      return true;
    }),

  decodeToken,
  authorizeSecurityCompany,
  securityCompanyServices.updateSecurityCompany
);

router.delete(
  "/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  decodeToken,
  authorizeAdmin,
  securityCompanyServices.deleteCompany
);

router.patch(
  "/remove-officer/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  decodeToken,
  authorizeSecurityCompany,
  securityCompanyServices.deleteOfficer
);

router.get(
  "/",
  decodeToken,
  authorizeSecurityCompany,
  securityCompanyServices.myProfile
);

export default router;
