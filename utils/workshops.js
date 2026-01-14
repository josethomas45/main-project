const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://finalproject-production-fcdc.up.railway.app";

export async function fetchWorkshops({ latitude, longitude, token }) {
  const res = await fetch(
    `${BACKEND_URL}/vehicle/workshops?latitude=${latitude}&longitude=${longitude}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch workshops");
  }

  return res.json();
}
