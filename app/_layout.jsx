import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { VehicleProvider } from "../contexts/VehicleContext";

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

  useEffect(() => {
    if (!isLoaded) return;

    const onAuthPage = segments[0] === "login" || segments[0] === "signup";
    const onVinCheck = segments[0] === "vin-check";
    const atRoot = segments[0] === undefined || segments[0] === "" || segments[0] === "index";

    console.log("🔐 Clerk Auth:", { isSignedIn, segments });

    if (!isSignedIn && !onAuthPage && !onVinCheck) {
      // Unauthenticated users must go to login
      router.replace("/login");
    } else if (isSignedIn && onAuthPage) {
      // Authenticated users shouldn't be on login/signup — send to VIN check
      router.replace("/vin-check");
    } else if (isSignedIn && atRoot) {
      // Authenticated users at the root/index — send to VIN check first
      router.replace("/vin-check");
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