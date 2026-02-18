import { useRouter } from "expo-router";
import VehicleCheckModal from "../components/VehicleCheckModal";

/**
 * VIN Check Screen
 *
 * This screen is shown to every signed-in user at the start of each session,
 * before they can access the rest of the app. It runs the OBD → VIN detection
 * → vehicle registration flow, and only navigates to /chat on success.
 */
export default function VinCheck() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace("/chat");
  };

  return <VehicleCheckModal visible={true} onComplete={handleComplete} />;
}
