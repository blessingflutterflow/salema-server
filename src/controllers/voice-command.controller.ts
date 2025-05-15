import express from "express";
import { body, param } from "express-validator";

import voiceCommandServices from "../services/voice-command.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";

const router = express.Router();

router.post(
  "/",

  body("text")
    .isString()
    .withMessage("Text must be string.")
    .notEmpty()
    .withMessage("Text is required."),

  body("type").optional().isString().withMessage("Type must be string."),

  body("emergencyContact")
    .isMongoId()
    .withMessage("Invalid emergency contact ID")
    .notEmpty()
    .withMessage("Emergency contact is required."),

  decodeToken,
  authorizeClient,
  voiceCommandServices.addVoiceCommand
);

router.get(
  "/",
  decodeToken,
  authorizeClient,
  voiceCommandServices.listVoiceCommands
);

router.put(
  "/:id",

  param("id")
    .exists()
    .withMessage("ID parameter is required.")
    .isMongoId()
    .withMessage("Invalid ID format."),

  body("text")
    .isString()
    .withMessage("Text must be string.")
    .notEmpty()
    .withMessage("Text is required."),

  body("type").optional().isString().withMessage("Type must be string."),

  decodeToken,
  authorizeClient,
  voiceCommandServices.updateVoiceCommand
);

router.delete(
  "/:id",

  param("id")
    .exists()
    .withMessage("ID parameter is required.")
    .isMongoId()
    .withMessage("Invalid ID format."),

  decodeToken,
  authorizeClient,
  voiceCommandServices.deleteVoiceCommand
);

export default router;
