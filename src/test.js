const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "temoshomaduane@gmail.com", // your Gmail address
    pass: "adkmxrzgpmnqpoeb",   // the 16-character app password
  },
});

(async () => {
  const info = await transporter.sendMail({
    from: '"Temosho Shaku" <temoshomaduane@gmail.com>', // sender address
    to: "temoshomaduane@gmail.com",                // recipient
    subject: "Gmail Test ✔",
    text: "This is a test email using Gmail SMTP!",
    html: "<b>This is a test email using Gmail SMTP!</b>",
  });

  console.log("Message sent:", info.messageId);
})();
