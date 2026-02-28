import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef } from "react";
import { VehicleProvider } from "../contexts/VehicleContext";
import {
  initNotifications,
  requestNotificationPermissions,
} from "../utils/notifications";

// Token cache for Clerk
const tokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("Error saving token:", err);
    }
  },
};

// Initial Layout that provides Clerk context
function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const notificationResponseListener = useRef();

  // Initialize notifications on mount
  useEffect(() => {
    initNotifications();
    requestNotificationPermissions();

    // Navigate to Maintenance page when a notification is tapped
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) {
          router.push(screen);
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const onAuthPage = segments[0] === "login" || segments[0] === "signup";
    const onVinCheck = segments[0] === "vin-check";
    const atRoot =
      segments[0] === undefined ||
      segments[0] === "" ||
      segments[0] === "index";

    // Protected app routes — anything that requires sign-in
    const protectedRoutes = [
      "chat",
      "dashboard",
      "profile",
      "HistoryPage",
      "MaintenanceTracking",
      "OBDIssues",
      "home",
      "schedule",
      "cost-tracking",
    ];
    const onProtectedPage = protectedRoutes.includes(segments[0]);

    console.log("🔐 Clerk Auth:", { isSignedIn, segments });

    // Defer navigation to next tick so Expo Router's stack has settled
    if (!isSignedIn && !onAuthPage) {
      // Unauthenticated users must go to login
      setTimeout(() => router.replace("/login"), 0);
    } else if (isSignedIn && onAuthPage) {
      // Authenticated users shouldn't be on login/signup — send to VIN check
      setTimeout(() => router.replace("/vin-check"), 0);
    } else if (isSignedIn && (atRoot || (!onVinCheck && !onProtectedPage))) {
      // Authenticated users at root or on an unknown/unmatched route
      setTimeout(() => router.replace("/vin-check"), 0);
    }
  }, [isSignedIn, isLoaded, segments]);

  if (!isLoaded) {
    return null; // Show loading screen
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}


export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <VehicleProvider>
        <RootLayoutNav />
      </VehicleProvider>
    </ClerkProvider>
  );
}