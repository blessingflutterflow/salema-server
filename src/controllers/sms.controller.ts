import { Router, Request, Response } from "express";
import twilio from "twilio";

const smsRouter = Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromPhone = process.env.TWILIO_PHONE!;
const client = twilio(accountSid, authToken);

smsRouter.post("/", async (req: Request, res: Response) => {
  const { to, message } = req.body;

  try {
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to,
    });

    res.status(200).json({ success: true, sid: result.sid });
  } catch (error: any) {
    console.error("SMS sending error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default smsRouter;
