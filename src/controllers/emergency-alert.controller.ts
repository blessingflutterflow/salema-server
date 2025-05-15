import { Router } from "express";
import { body, param } from "express-validator";

import emergencyAlertServices from "../services/emergency-alert.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";
import authorizeAdmin from "../middlewares/authorizeAdmin";
import { AlertType } from "../utils/types/emergency-alert";
import authorizeSecurityOfficer from "../middlewares/authorizeSecurityOfficer";

const router = Router();

router.post(
  "/",
  body("location")
    .exists()
    .withMessage("Location is required.")
    .isObject()
    .withMessage("Location must be an object.")
    .custom((value) => {
      if (
        typeof value.latitude !== "number" ||
        typeof value.longitude !== "number"
      ) {
        throw new Error("Latitude and Longitude must be numbers.");
      }
      return true;
    }),

  body("alertType")
    .exists()
    .withMessage("Alert type is required.")
    .isIn(Object.values(AlertType))
    .withMessage(
      `Alert type must be one of: ${Object.values(AlertType).join(", ")}`
    ),

  body("serviceRequestId")
    .optional()
    .isString()
    .withMessage("Service request ID must be a string."),
  decodeToken,
  authorizeClient,
  emergencyAlertServices.create
);

router.get(
  "/list",
  decodeToken,
  authorizeClient,
  emergencyAlertServices.listMyAlerts
);

router.get(
  "/list-assigned",
  decodeToken,
  authorizeSecurityOfficer,
  emergencyAlertServices.listAssignedAlerts
);

router.get(
  "/",
  decodeToken,
  authorizeAdmin,
  emergencyAlertServices.listAllAlerts
);

router.post(
  "/contact-alert/:emergencyContactId",
  param("emergencyContactId")
    .exists()
    .withMessage("ID parameter is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  body("location")
    .exists()
    .withMessage("Location is required.")
    .isObject()
    .withMessage("Location must be an object.")
    .custom((value) => {
      if (
        typeof value.latitude !== "number" ||
        typeof value.longitude !== "number"
      ) {
        throw new Error("Latitude and Longitude must be numbers.");
      }
      return true;
    }),

  body("serviceRequestId")
    .optional()
    .isString()
    .withMessage("Service request ID must be a string."),
  decodeToken,
  authorizeClient,
  emergencyAlertServices.alertContact
);

export default router;
