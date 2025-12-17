import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup =
      segments[0] === "login" || segments[0] === "signup";

    if (!session && !inAuthGroup) {
      router.replace("/login");
    }

    if (session && inAuthGroup) {
      router.replace("/chat");
    }
  }, [session, loading, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
