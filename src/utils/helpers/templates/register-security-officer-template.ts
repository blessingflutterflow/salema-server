export const registerSecurityOfficerEmailBody = (
  fullName: string,
  email: string,
  password: string,
  from: string,
  fromEmail: string
): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account was created for you</title>
       <style>
        body { font-family: Arial, sans-serif; background-color: #f8f9fa; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .salutation { margin: 0;}
    </style>
  </head>
  <body>
      <div class="container">
          <p>Hi, ${fullName}</p>
          <p>Welcome to ${from}! Below are your login credentials to access your account:</p>
          <ul>
            <li><b>Email Address:</b> ${email}</li>
            <li><b>Password:</b> ${password}</li>
          </ul>
          <p>If you have any questions or need assistance, feel free to reach out.</p>
          <p class="salutation">Best regards,</p>
          <p class="salutation">Human Resources</p>
          <p class="salutation">${fromEmail}</p>
      </div>
  </body>
  </html>
  `;
