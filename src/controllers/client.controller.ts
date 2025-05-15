import express from "express";
import { body, param } from "express-validator";

import clientServices from "../services/client.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";
import authorizeAdmin from "../middlewares/authorizeAdmin";
import { upload } from "../utils/helpers/multer";

const router = express.Router();

router.post(
  "/register",
  body("firstName")
    .isString()
    .withMessage("First name is required")
    .notEmpty()
    .withMessage("First name cannot be empty"),

  body("surname").optional().isString().withMessage("Surname must be a string"),

  body("address").optional().isString().withMessage("Address must be a string"),

  body("contact")
    .isString()
    .withMessage("Contact is required")
    .notEmpty()
    .withMessage("Contact cannot be empty"),

  body("password")
    .isString()
    .withMessage("Password is required")
    .notEmpty()
    .withMessage("Password cannot be empty")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("email")
    .isEmail()
    .withMessage("Invalid email format")
    .notEmpty()
    .withMessage("Email is required"),
  clientServices.register
);

router.get(
  "/my-profile",
  decodeToken,
  authorizeClient,
  clientServices.myProfile
);

router.put(
  "/my-profile",
  body("firstName")
    .isString()
    .withMessage("First name must be a string.")
    .notEmpty()
    .withMessage("First name is required."),

  body("surname")
    .isString()
    .withMessage("Surname must be a string.")
    .notEmpty()
    .withMessage("Surname is required."),

  body("contact")
    .isString()
    .withMessage("Contact must be a string.")
    .notEmpty()
    .withMessage("Contact is required.")
    .withMessage("Contact must be a valid mobile number."),

  body("address")
    .isString()
    .withMessage("Address must be a string.")
    .notEmpty()
    .withMessage("Address is required."),
  decodeToken,
  authorizeClient,
  clientServices.updateProfile
);

router.put(
  "/update/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  body("firstName")
    .isString()
    .withMessage("First name must be a string.")
    .notEmpty()
    .withMessage("First name is required."),

  body("surname")
    .isString()
    .withMessage("Surname must be a string.")
    .notEmpty()
    .withMessage("Surname is required."),

  body("contact")
    .isString()
    .withMessage("Contact must be a string.")
    .notEmpty()
    .withMessage("Contact is required.")
    .withMessage("Contact must be a valid mobile number."),

  body("address")
    .isString()
    .withMessage("Address must be a string.")
    .notEmpty()
    .withMessage("Address is required."),
  decodeToken,
  authorizeAdmin,
  clientServices.updateClientProfile
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
  clientServices.deleteClient
);

router.post(
  "/missing-person",

  upload.single("image"),

  body("image").custom((value, { req }) => {
    if (!req.file) {
      throw new Error("No file uploaded.");
    }
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(req.file.mimetype)) {
      throw new Error(
        "Invalid file type. Only JPEG, JPG, and PNG files are allowed."
      );
    }
    return true;
  }),

  body("personName")
    .isString()
    .withMessage("Person name must be string.")
    .notEmpty()
    .withMessage("Person name is required."),

  body("age")
    .isInt({ min: 0 })
    .withMessage("Age must be number.")
    .notEmpty()
    .withMessage("Age is required."),

  body("lastSeenDateTime")
    .isISO8601()
    .withMessage("Last seen date time must be a valid ISO 8601 date.")
    .notEmpty()
    .withMessage("Last seen date time is required."),

  body("lastSeenLocation")
    .isString()
    .withMessage("Last seen location must be a string.")
    .notEmpty()
    .withMessage("Last seen location is required."),

  body("contact")
    .isString()
    .withMessage("Contact is required.")
    .notEmpty()
    .withMessage("Contact cannot be empty."),

  decodeToken,
  authorizeClient,
  clientServices.addMissingPerson
);

router.get(
  "/missing-person/info/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required.")
    .isMongoId()
    .withMessage("Invalid ID format."),
  clientServices.getMissingPerson
);

router.get("/missing-persons", clientServices.listMissingPersons);

router.put(
  "/missing-person/:id",

  param("id")
    .exists()
    .withMessage("ID parameter is required.")
    .isMongoId()
    .withMessage("Invalid ID format."),

  body("lastSeenDateTime")
    .isISO8601()
    .withMessage("Last seen date time must be a valid ISO 8601 date.")
    .notEmpty()
    .withMessage("Last seen date time is required."),

  body("lastSeenLocation")
    .isString()
    .withMessage("Last seen location must be a string.")
    .notEmpty()
    .withMessage("Last seen location is required."),

  body("missingStatus")
    .isIn(["missing", "found"])
    .withMessage("Missing status must be one of: missing, found."),

  decodeToken,
  authorizeClient,
  clientServices.updateMissingPerson
);

router.delete(
  "/missing-person/:id",
  param("id")
    .exists()
    .withMessage("ID parameter is required.")
    .isMongoId()
    .withMessage("Invalid ID format."),
  decodeToken,
  authorizeClient,
  clientServices.deleteMissingPerson
);

router.post(
  "/comment",

  body("body")
    .isString()
    .withMessage("Comment body must be string.")
    .notEmpty()
    .withMessage("Comment body is required."),

  body("missingPerson")
    .isMongoId()
    .withMessage("Invalid missing person ID")
    .notEmpty()
    .withMessage("Missing person is required."),

  decodeToken,
  authorizeClient,
  clientServices.addComment
);

router.put(
  "/comment/:id",

  param("id")
    .exists()
    .withMessage("ID parameter is required.")
    .isMongoId()
    .withMessage("Invalid ID format."),

  body("body")
    .isString()
    .withMessage("Comment body must be string.")
    .notEmpty()
    .withMessage("Comment body is required."),

  decodeToken,
  authorizeClient,
  clientServices.updateComment
);

router.delete(
  "/comment/:id",

  param("id")
    .exists()
    .withMessage("ID parameter is required.")
    .isMongoId()
    .withMessage("Invalid ID format."),

  decodeToken,
  authorizeClient,
  clientServices.deleteComment
);

router.get("/list-all", decodeToken, authorizeAdmin, clientServices.listAll);

export default router;
