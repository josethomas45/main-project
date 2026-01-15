const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://finalproject-production-fcdc.up.railway.app";

/* =======================
   MAINTENANCE CRUD
   ======================= */

export async function fetchMaintenance(getToken) {
  const token = await getToken();

  const res = await fetch(`${BACKEND_URL}/maintenance/`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch maintenance");
  return res.json();
}

export async function createMaintenance(data, getToken) {
  const token = await getToken();

  const res = await fetch(`${BACKEND_URL}/maintenance/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create maintenance");
  return res.json();
}

export async function updateMaintenance(id, data, getToken) {
  const token = await getToken();

  const res = await fetch(`${BACKEND_URL}/maintenance/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to update maintenance");
  return res.json();
}

export async function deleteMaintenance(id, getToken) {
  const token = await getToken();

  const res = await fetch(`${BACKEND_URL}/maintenance/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to delete maintenance");
}

/* =======================
   MAINTENANCE RULES
   ======================= */

export async function fetchMaintenanceRules() {
  const res = await fetch(`${BACKEND_URL}/maintenance/rules`);

  if (!res.ok) {
    throw new Error("Failed to fetch maintenance rules");
  }

  return res.json();
}
 