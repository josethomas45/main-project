import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export default function RootLayout() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!session) router.replace("/login");
    }
  }, [session, loading]);

  return <Stack />;
}
