import { Router } from "express";
import { body, param } from "express-validator";

import decodeToken from "../middlewares/decodeToken";
import eventService from "../services/event.service";
import authorizeAdmin from "../middlewares/authorizeAdmin";
import authorizeSecurityOfficer from "../middlewares/authorizeSecurityOfficer";

const router = Router();

router.post(
  "/:serviceRequestId",
  body("eventTitle")
    .isString()
    .withMessage("Event title must be a string")
    .notEmpty()
    .withMessage("Event title cannot be empty"),

  body("eventBody")
    .isString()
    .withMessage("Event body must be a string")
    .notEmpty()
    .withMessage("Event body cannot be empty"),
  decodeToken,
  eventService.create
);

router.get("/", decodeToken, eventService.listMyEvents);

router.get(
  "/list-all",
  decodeToken,
  authorizeAdmin,
  eventService.listAllEvents
);

router.patch(
  "/:eventId",
  param("eventId").isMongoId().withMessage("Invalid Event ID format"),
  body("status")
    .isIn(["pending", "completed"])
    .withMessage('Status must be either "pending" or "completed"'),
  decodeToken,
  authorizeSecurityOfficer,
  eventService.updateEvent
);

router.get(
  "/:serviceRequestId",
  param("serviceRequestId")
    .isMongoId()
    .withMessage("Invalid Service Request ID format"),
  decodeToken,
  eventService.listServiceRequestEvents
);
router.post(
  "/comment/:eventId",
  param("eventId").isMongoId().withMessage("Invalid eventId format"),

  body("comment")
    .isString()
    .withMessage("Comment must be a string")
    .notEmpty()
    .withMessage("Comment cannot be empty"),
  decodeToken,
  authorizeSecurityOfficer,
  eventService.addComment
);

router.delete(
  "/comment/:eventId",
  param("eventId").isMongoId().withMessage("Invalid eventId format"),

  body("commentId").isMongoId().withMessage("Invalid commentId format"),
  decodeToken,
  authorizeSecurityOfficer,
  eventService.deleteComment
);

export default router;
