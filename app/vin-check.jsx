import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import VehicleCheckModal from "../components/VehicleCheckModal";

/**
 * VIN Check Screen
 *
 * This screen is shown to every signed-in user at the start of each session,
 * before they can access the rest of the app. It runs the OBD → VIN detection
 * → vehicle registration flow, and only navigates to /chat on success.
 *
 * Note: VehicleCheckModal is rendered with visible={true} inside a full-screen
 * container so it displays correctly on both mobile and web.
 */
export default function VinCheck() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace("/chat");
  };

  return (
    <View style={styles.container}>
      <VehicleCheckModal visible={true} onComplete={handleComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
});
