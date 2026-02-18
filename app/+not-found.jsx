import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";

/**
 * Catch-all for unmatched routes.
 * Redirects signed-in users to vin-check, others to login.
 * This prevents the "Unmatched Route" error screen during auth transitions.
 */
export default function NotFound() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? "/vin-check" : "/login"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
});
