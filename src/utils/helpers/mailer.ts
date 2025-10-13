import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generic email sender
export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}) => {
  await transporter.sendMail({
    from: '"Salema Admin" <admin@mansalema.co.za>',
    to,
    subject,
    html,
  });
};

// Specific function to resend the forgot password code
export const sendResendCode = async ({
  to,
  resetCode,
}: {
  to: string[];
  resetCode: string;
}) => {
  const subject = "Salema Password Reset Code";
  const html = `
    <p>You requested to resend your password reset code.</p>
    <p>Your new code is: <b>${resetCode}</b></p>
    <p>This code expires in 15 minutes.</p>
  `;

  await transporter.sendMail({
    from: '"Salema Admin" <admin@mansalema.co.za>',
    to,
    subject,
    html,
  });
};
