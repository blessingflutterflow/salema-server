import admin from "firebase-admin";
import FcmToken from "../../models/fcmToken.model";

export const sendNotification = async (
  tokens: string[],
  title: string,
  message: string
) => {
  const promises = tokens.map(async (token) => {
    if (typeof token === "string" && token.length > 0) {
      try {
        console.log(`📲 Sending FCM to token: ${token}`);
        await admin.messaging().send({
          token,
          notification: {
            title,
            body: message,
          },
          android: {
            notification: {
              channelId: 'danger-alerts',
              sound: 'default',
              priority: 'high',
            },
          },
        });
        
      } catch (firebaseError: any) {
        if (
          firebaseError.code === "messaging/invalid-argument" ||
          firebaseError.code === "messaging/registration-token-not-registered"
        ) {
          await FcmToken.deleteOne({ fcmToken: token });
          console.warn(`❌ Removed invalid FCM token: ${token}`);
        }
         else {
          console.error("Error sending FCM notification:", firebaseError);
        }
      }
    } else {
      console.warn(`Invalid FCM token format: ${token}`);
    }
  });

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error("Error processing notification promises:", error);
  }
};
