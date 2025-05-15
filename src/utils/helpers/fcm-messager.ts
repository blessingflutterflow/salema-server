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
        await admin.messaging().send({
          notification: {
            title,
            body: message,
          },
          token,
        });
      } catch (firebaseError: any) {
        if (firebaseError.code === "messaging/invalid-argument") {
          await FcmToken.deleteOne({ fcmToken: token });
          console.warn(`Removed invalid FCM token: ${token}`);
        } else {
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
