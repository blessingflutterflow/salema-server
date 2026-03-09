import express from "express";
import { body, param } from "express-validator";

import serviceRequestServices from "../services/service-request.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";
import authorizeSecurityCompany from "../middlewares/authorizeSecurityCompany";
import authorizeSecurityOfficer from "../middlewares/authorizeSecurityOfficer";
import authorizeAdmin from "../middlewares/authorizeAdmin";

const router = express.Router();

router.post(
  "/",
  // securityCompany is optional for vehicle-escort (auto-assigned)
  body("securityCompany")
    .optional()
    .isMongoId()
    .withMessage("Invalid security company ID."),

  body("requestedServices")
    .isArray()
    .withMessage("Requested services must be an array.")
    .notEmpty()
    .withMessage("Requested services are required."),

  body("requestedDateTime")
    .isISO8601()
    .withMessage("Requested date time must be a valid ISO 8601 date.")
    .notEmpty()
    .withMessage("Requested date time is required."),

  body("priority")
    .isIn(["high", "medium", "low"])
    .withMessage("Priority must be either high, medium, or low.")
    .notEmpty()
    .withMessage("Priority is required."),

  body("location")
    .isObject()
    .withMessage("Location must be an object.")
    .custom((value) => {
      if (
        typeof value.latitude !== "string" ||
        isNaN(parseFloat(value.latitude))
      ) {
        throw new Error("Latitude must be a valid number in string format.");
      }
      if (
        typeof value.longitude !== "string" ||
        isNaN(parseFloat(value.longitude))
      ) {
        throw new Error("Longitude must be a valid number in string format.");
      }
      return true;
    }),

  body("body").optional().isString().withMessage("Body must be a string."),

  // Vehicle escort specific fields
  body("escortTier")
    .optional()
    .isIn(["general", "standard", "premium", "presidential"])
    .withMessage("escortTier must be general, standard, premium, or presidential."),

  body("destination")
    .optional()
    .isString()
    .withMessage("Destination must be a string."),

  decodeToken,
  authorizeClient,
  serviceRequestServices.create
);

router.put(
  "/",
  body("serviceRequestId")
    .isMongoId()
    .withMessage("Invalid service request ID."),

  body("status")
    .isIn(["pending", "approved", "rejected", "in-progress", "completed"])
    .withMessage(
      "Status must be one of the following: pending, approved, rejected, in-progress, completed."
    ),

  body("assignedOfficers")
    .optional()
    .isArray()
    .withMessage("Assigned officer IDs must be an array.")
    .custom((value) => {
      if (
        value.some(
          (id: string) =>
            !id || typeof id !== "string" || !id.match(/^[0-9a-fA-F]{24}$/)
        )
      ) {
        throw new Error(
          "Each assigned officer ID must be a valid MongoDB ObjectId."
        );
      }
      return true;
    }),

  body("body").optional().isString().withMessage("Body must be a string."),
  decodeToken,
  authorizeSecurityCompany,
  serviceRequestServices.update
);

// Officer accept / start / complete an escort
router.patch(
  "/:id/officer-action",
  param("id").isMongoId().withMessage("Invalid service request ID."),
  body("action")
    .isIn(["accept", "start", "complete"])
    .withMessage("action must be accept, start, or complete."),
  decodeToken,
  authorizeSecurityOfficer,
  serviceRequestServices.officerAction
);

// Officer pushes live GPS location
router.post(
  "/:id/location",
  param("id").isMongoId().withMessage("Invalid service request ID."),
  body("latitude").isFloat().withMessage("latitude must be a number."),
  body("longitude").isFloat().withMessage("longitude must be a number."),
  decodeToken,
  authorizeSecurityOfficer,
  serviceRequestServices.updateDriverLocation
);

router.patch(
  "/:serviceRequestId",
  param("serviceRequestId")
    .isMongoId()
    .withMessage("Invalid service request ID."),

  body("status")
    .isIn(["pending", "approved", "rejected", "in-progress", "completed"])
    .withMessage(
      "Status must be one of the following: pending, approved, rejected, in-progress, completed."
    ),
  decodeToken,
  authorizeSecurityOfficer,
  serviceRequestServices.updateStatus
);

router.delete(
  "/:serviceRequestId",
  param("serviceRequestId")
    .isMongoId()
    .withMessage("Invalid service request ID."),
  decodeToken,
  authorizeClient,
  serviceRequestServices.remove
);

router.get(
  "/info/:serviceRequestId",
  param("serviceRequestId")
    .isMongoId()
    .withMessage("Invalid service request ID."),
  decodeToken,
  serviceRequestServices.get
);

router.get(
  "/client",
  decodeToken,
  authorizeClient,
  serviceRequestServices.listClientRequests
);

router.get(
  "/company",
  decodeToken,
  authorizeSecurityCompany,
  serviceRequestServices.listCompanyRequests
);

router.get(
  "/officer",
  decodeToken,
  authorizeSecurityOfficer,
  serviceRequestServices.listOfficerRequests
);

router.get(
  "/",
  decodeToken,
  authorizeAdmin,
  serviceRequestServices.listAllRequests
);

export default router;
