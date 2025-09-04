import { sendEmail } from "../utils/helpers/mailer";

export const sendAdminNotification = async (
  companyName: string,
  email: string,
  phone: string
) => {
  const subject = "New Security Company Registration";

  const now = new Date();
  const dateTime = now.toLocaleString(); 
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const html = `
    <h3>A new security company has registered.</h3>
    <p><strong>Company Name:</strong> ${companyName}</p>
    <p><strong>Contact Email:</strong> ${email}</p>
    <p><strong>Contact Phone Number:</strong> ${phone}</p>
    <p><strong>Registered On:</strong> ${dateTime} (${timeZone})</p>
  `;

  await sendEmail({
    to: ["temoshomaduane@gmail.com", "morekolodi.mankuroane@gmail.com"],
    subject,
    html,
  });
};
