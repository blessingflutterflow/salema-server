import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "kenway.aserv.co.za", // your outgoing server
  port: 465,                  // secure SMTP port
  secure: true,               // true for port 465
  auth: {
    user: "admin@mansalema.co.za", // your email
    pass: "Mansalema@25",   // your actual password
  },
});

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
    from: '"Salema Admin" <admin@mansalema.co.za>', // shows as sender
    to,
    subject,
    html,
  });
};
