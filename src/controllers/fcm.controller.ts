import { Router } from "express";
import { body } from "express-validator";

import fcmtokenServices from "../services/fcmtoken.services";
import decodeToken from "../middlewares/decodeToken";

const router = Router();

router.post(
  "/",
  body("fcmToken").notEmpty().withMessage("fcmToken is required."),
  decodeToken,
  fcmtokenServices.upsertFcmToken
);

router.delete("/", decodeToken, fcmtokenServices.deleteFcmToken);

export default router;
