import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "temoshomaduane@gmail.com", // Your Gmail
    pass: "adkmxrzgpmnqpoeb",         // 16-digit App Password
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
    from: '"Temosho Shaku" <temoshomaduane@gmail.com>',
    to,
    subject,
    html,
  });
};
