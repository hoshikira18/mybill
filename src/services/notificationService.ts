import messaging from "@react-native-firebase/messaging";
import firestore from "@react-native-firebase/firestore";
import { Alert, Platform } from "react-native";
import * as Notifications from 'expo-notifications';

// Show system notifications when app is foreground (expo-notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    // newer SDKs require these fields
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

async function configureAndroidChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    } catch (err) {
      console.warn('Could not create Android notification channel:', err);
    }
  }
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    console.log("Notification permission status:", authStatus);

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("✅ Notification permission granted");
    } else {
      console.log("❌ Notification permission denied or not determined");
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
    // Use expo-notifications to show a system/local notification immediately
    await configureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
      
    });
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
    // if a custom handler is provided, call it
    if (onNotificationReceived) {
      onNotificationReceived(remoteMessage);
      return;
    }

    // Show a system/local notification for foreground messages
    try {
      const dataTitle = remoteMessage.data && typeof remoteMessage.data.title === 'string' ? remoteMessage.data.title : undefined;
      const dataBody = remoteMessage.data && typeof remoteMessage.data.body === 'string' ? remoteMessage.data.body : undefined;
      const title = remoteMessage.notification?.title ?? dataTitle ?? 'Thông báo';
      const body = remoteMessage.notification?.body ?? dataBody ?? '';

      await configureAndroidChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: remoteMessage.data || {},
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('Failed to present local notification, falling back to Alert:', err);
      Alert.alert(remoteMessage.notification?.title || 'Thông báo', remoteMessage.notification?.body || '');
    }
  });

  // Handle background/quit state notifications
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || 'Thông báo',
          body: remoteMessage.notification?.body || '',
          data: remoteMessage.data || {},
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
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
