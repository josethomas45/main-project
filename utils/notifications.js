import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "maintenance-reminders";

/**
 * Set up Android notification channel + foreground handler.
 * Call once at app start (e.g. in _layout.jsx).
 */
export async function initNotifications() {
  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Maintenance Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6366f1",
    });
  }

  // Show notifications even when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions from the user.
 * @returns {boolean} whether permissions were granted
 */
export async function requestNotificationPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Schedule a maintenance reminder notification.
 *
 * @param {string} serviceType  — display name (e.g. "Engine Oil Change")
 * @param {Date}   dueDate      — when to fire the notification
 * @param {string} [notes]      — optional extra info
 * @param {string|number} [recordId] — ID of maintenance record to use for stable notification ID
 * @returns {Promise<string>}   — notification identifier
 */
export async function scheduleMaintenanceReminder(
  serviceType,
  dueDate,
  notes,
  recordId
) {
  const now = new Date();

  // If due date is in the past, skip
  if (dueDate <= now) {
    console.log("Notification skipped – due date is in the past:", dueDate);
    return null;
  }

  // Use stable ID if recordId provided
  const identifier = recordId ? `maintenance-${recordId}` : undefined;

  const id = await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "🔧 Maintenance Due",
      body: `Your ${serviceType} is due today!${notes ? `\n${notes}` : ""}`,
      data: { screen: "/MaintenanceTracking", serviceType, recordId },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dueDate,
      channelId: CHANNEL_ID,
    },
  });

  console.log(
    `📅 Scheduled reminder for "${serviceType}" on ${dueDate.toLocaleDateString()} → id: ${id}`
  );
  return id;
}



/**
 * Cancel a specific scheduled notification.
 * @param {string|number} recordId — the ID of the maintenance record
 */
export async function cancelMaintenanceReminder(recordId) {
  if (!recordId) return;
  const identifier = `maintenance-${recordId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  console.log(`🗑️ Cancelled notification for record: ${identifier}`);
}

/**
 * Cancel all scheduled maintenance notifications.
 */
export async function cancelAllMaintenanceReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("🗑️ Cancelled all scheduled notifications");
}
