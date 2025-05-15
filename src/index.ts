import express, { Request, Response } from "express";
import morgan from "morgan";
import "dotenv/config";
import admin from "firebase-admin";
import path from "path";

import connectDatabase from "./utils/database/dbConnect";
import { checkUploadsDirExist } from "./utils/helpers/multer";

import userRouter from "./controllers/user.controller";
import adminRouter from "./controllers/admin.controller";
import clientRouter from "./controllers/client.controller";
import securityCompanyRouter from "./controllers/security-company.controller";
import securityOfficerRouter from "./controllers/security-officer.controller";
import fcmTokenRouter from "./controllers/fcm.controller";
import serviceRequestRouter from "./controllers/service-request.controller";
import dangerZoneRouter from "./controllers/danger-zone.controller";
import emergencyContactRouter from "./controllers/emergency-contact.controller";
import emergencyAlertRouter from "./controllers/emergency-alert.controller";
import eventRouter from "./controllers/event.controller";
import voiceCommandRouter from "./controllers/voice-command.controller";
import smsRouter from "./controllers/sms.controller";

const app = express();
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDatabase();
checkUploadsDirExist();

app.use(morgan("tiny"));

app.get("/", (req: Request, res: Response) => {
  const htmlContent = `
    <html>
      <head>
        <title>Ping Response</title>
      </head>
      <body>
        <h1>Salema App Backend v0.0.7</h1>
      </body>
    </html>
  `;

  res.send(htmlContent);
});

app.use("/send-sms", smsRouter);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use("/user/v1", userRouter);
app.use("/admin/v1/", adminRouter);
app.use("/client/v1", clientRouter);
app.use("/security-company/v1", securityCompanyRouter);
app.use("/fcm-token/v1", fcmTokenRouter);
app.use("/service-request/v1", serviceRequestRouter);
app.use("/security-officer/v1", securityOfficerRouter);
app.use("/danger-zone/v1", dangerZoneRouter);
app.use("/emergency-contact/v1", emergencyContactRouter);
app.use("/emergency-alert/v1", emergencyAlertRouter);
app.use("/event/v1", eventRouter);
app.use("/voice-command/v1", voiceCommandRouter);
