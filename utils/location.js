import * as Location from "expo-location";

export async function getDeviceLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };
}
