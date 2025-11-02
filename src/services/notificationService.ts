import messaging from "@react-native-firebase/messaging";
import firestore from "@react-native-firebase/firestore";
import { Alert, Platform } from "react-native";

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("Notification permission granted");
    }

    return enabled;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

/**
 * Get FCM token for the device
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

/**
 * Save FCM token to Firestore for the user
 */
export async function saveFCMToken(userId: string): Promise<void> {
  try {
    const token = await getFCMToken();
    if (token) {
      await firestore().collection("users").doc(userId).set(
        {
          fcmToken: token,
          fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
          platform: Platform.OS,
        },
        { merge: true }
      );
      console.log("FCM token saved to Firestore");
    }
  } catch (error) {
    console.error("Error saving FCM token:", error);
  }
}

/**
 * Send a local notification (for immediate feedback)
 */
export async function sendLocalNotification(
  title: string,
  body: string
): Promise<void> {
  try {
    // This would require expo-notifications for local notifications
    // For now, we'll use Alert as a fallback
    Alert.alert(title, body);
  } catch (error) {
    console.error("Error sending local notification:", error);
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: any) => void
) {
  // Handle foreground notifications
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    console.log("Foreground notification:", remoteMessage);

    if (onNotificationReceived) {
      onNotificationReceived(remoteMessage);
    } else {
      // Show alert if no custom handler
      Alert.alert(
        remoteMessage.notification?.title || "Thông báo",
        remoteMessage.notification?.body || ""
      );
    }
  });

  // Handle background/quit state notifications
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("Background notification:", remoteMessage);
  });

  // Handle notification opened app
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("Notification opened app:", remoteMessage);
  });

  // Check if app was opened from a notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log("App opened from notification:", remoteMessage);
      }
    });

  return unsubscribeForeground;
}

/**
 * Send notification via Firestore trigger
 * This will create a document that triggers a Cloud Function to send FCM notification
 */
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    await firestore()
      .collection("notifications")
      .add({
        userId,
        title,
        body,
        data: data || {},
        status: "pending",
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    console.log("Notification queued for user:", userId);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}
