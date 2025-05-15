// import nodemailer from "nodemailer";

import { IMailOptions } from "../types/mail-options";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// export const sendEmail = async ({
//   to,
//   subject,
//   html,
// }: IMailOptions): Promise<void> => {
//   try {
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to,
//       subject,
//       html,
//     });
//   } catch (error) {
//     console.error("Error sending email:", error);
//   }
// };

import { EmailClient } from "@azure/communication-email";

const connectionString = process.env.AZURE_MAIL_CONNECTION_STRING ?? "";
const client = new EmailClient(connectionString);

export const sendEmail = async ({
  to,
  subject,
  html,
}: IMailOptions): Promise<void> => {
  try {
    const emailMessage = {
      senderAddress: process.env.AZURE_MAIL_SENDER_EMAIL ?? "",
      content: {
        subject: subject,
        html: html,
      },
      recipients: {
        to: to.map((item: string) => {
          return { address: item };
        }),
      },
    };

    const poller = await client.beginSend(emailMessage);
    await poller.pollUntilDone();
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
