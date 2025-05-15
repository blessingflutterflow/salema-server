import express from "express";
import { body, param } from "express-validator";

import emergencyContactServices from "../services/emergency-contact.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";

const router = express.Router();

router.post(
  "/",
  body("email")
    .isEmail()
    .withMessage("Email must be a valid email address")
    .notEmpty()
    .withMessage("Email is required"),

  body("name")
    .isString()
    .withMessage("Name must be a string")
    .notEmpty()
    .withMessage("Name is required"),

  body("relationship")
    .isString()
    .withMessage("Relationship must be a string")
    .notEmpty()
    .withMessage("Relationship is required"),

  body("phone")
    .isString()
    .withMessage("Phone must be a string")
    .notEmpty()
    .withMessage("Phone is required"),
  decodeToken,
  authorizeClient,
  emergencyContactServices.create
);

router.get("/", decodeToken, authorizeClient, emergencyContactServices.list);

router.delete(
  "/:id",
  param("id")
    .isMongoId()
    .withMessage("ID must be a valid MongoDB ObjectId")
    .notEmpty()
    .withMessage("ID is required"),
  decodeToken,
  authorizeClient,
  emergencyContactServices.remove
);

export default router;
