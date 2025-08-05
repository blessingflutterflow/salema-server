import express from "express";
import { body, param } from "express-validator";

import voiceCommandServices from "../services/voice-command.services";
import decodeToken from "../middlewares/decodeToken";
import authorizeClient from "../middlewares/authorizeClient";

const router = express.Router();

// Route to add voice command with optional emergencyContact
router.post(
  "/",
  body("text")
    .isString()
    .withMessage("Text must be string.")
    .notEmpty()
    .withMessage("Text is required."),
  body("type").optional().isString().withMessage("Type must be string."),
  body("emergencyContact")
    .optional()
    .isMongoId()
    .withMessage("Invalid emergency contact ID"),

  decodeToken,
  authorizeClient,
  voiceCommandServices.addVoiceCommand
);

// Save new voice command for current client
router.post(
  "/client",
  body("text")
    .isString()
    .withMessage("Text must be string.")
    .notEmpty()
    .withMessage("Text is required."),
  body("type").optional().isString().withMessage("Type must be string."),
  body("emergencyContact")
    .optional()
    .isMongoId()
    .withMessage("Invalid emergency contact ID"),

  decodeToken,
  authorizeClient,
  voiceCommandServices.addVoiceCommand
);

// GET /client
router.get(
  "/client",
  decodeToken,
  authorizeClient,
  voiceCommandServices.getVoiceCommandsForCurrentClient
);



// List all voice commands
router.get("/", decodeToken, authorizeClient, voiceCommandServices.listVoiceCommands);

router.delete(
  "/hard-delete/:id",
  param("id").isMongoId().withMessage("Invalid voice command ID."),

  decodeToken,
  authorizeClient,
  voiceCommandServices.hardDeleteVoiceCommand
);


// Update a voice command by ID
router.put(
  "/:id",
  param("id").isMongoId().withMessage("Invalid voice command ID."),
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

// Soft delete a voice command by ID
router.delete(
  "/:id",
  param("id").isMongoId().withMessage("Invalid voice command ID."),

  decodeToken,
  authorizeClient,
  voiceCommandServices.deleteVoiceCommand
);

export default router;
