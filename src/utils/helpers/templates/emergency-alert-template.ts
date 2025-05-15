export const emergencyAlertEmailBody = (
  alertType: string,
  location: number[],
  timestamp: string,
  from: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emergency Alert</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f8f9fa; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #d9534f; }
        .alert-info { background-color: #d9534f; color: white; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Emergency Alert!</h1>
        <div class="alert-info">
            <strong>Alert Type:</strong> ${alertType}<br>
            <strong>Location:</strong> ${location}
<br>
            <strong>Timestamp:</strong> ${timestamp}<br/>
          ${from && `<strong>Created by: </strong> ${from}`}
        </div>
        <p>Dear Team,</p>
        <p>This is an automated alert to inform you of an emergency situation. Please take immediate action as required.</p>
        <p>If you have any questions, please contact your supervisor or the emergency response team.</p>
        <p>Stay safe!</p>
        <div class="footer">
            <p>This is an automated message. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
`;
