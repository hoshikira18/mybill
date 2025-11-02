import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import {
  requestNotificationPermission,
  setupNotificationListeners,
} from "./src/services/notificationService";

export default function App() {
  useEffect(() => {
    // Check and request notification permission when app opens
    const checkNotificationPermission = async () => {
      try {
        await requestNotificationPermission();
      } catch (error) {
        console.error("Error checking notification permission:", error);
      }
    };

    checkNotificationPermission();

    // Setup foreground/background notification listeners
    const unsubscribe = setupNotificationListeners();

    return () => {
      // cleanup foreground listener
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
