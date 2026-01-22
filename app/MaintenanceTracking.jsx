import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  fetchMaintenance,
  createMaintenance,
  fetchMaintenanceRules,
  updateMaintenance,
  deleteMaintenance,
} from "../utils/maintenance";

// DEV ONLY
const DEV_VEHICLE_ID = "c6df84cb-90e9-4307-9f39-779dcaba9dd3";

// helpers
const todayISO = () => new Date().toISOString().split("T")[0];
const toDDMMYYYY = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

export default function MaintenanceTracking() {
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();

  const [rules, setRules] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // ✅ ADDED
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);

  const [newReminder, setNewReminder] = useState({
    service_type: "",
    notes: "",
    service_date: todayISO(),
    odometer_km: "",
  });

  const selectedRule = rules.find(
    (r) => r.service_type === newReminder.service_type
  );

  useEffect(() => {
    loadReminders();
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const res = await fetchMaintenanceRules();
      setRules(res.data || res || []);
    } catch {
      Alert.alert("Error", "Failed to load service types");
    }
  };

  const loadReminders = async () => {
    try {
      const res = await fetchMaintenance(getToken);
      setReminders(res.data || res || []);
    } catch {
      Alert.alert("Error", "Failed to load maintenance");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!newReminder.service_type) {
      Alert.alert("Error", "Select service type");
      return;
    }

    if (
      selectedRule?.requires_odometer &&
      (!newReminder.odometer_km ||
        Number(newReminder.odometer_km) <= 0)
    ) {
      Alert.alert("Error", "Odometer reading required");
      return;
    }

    try {
      await createMaintenance(
        {
          vehicle_id: DEV_VEHICLE_ID,
          service_type: newReminder.service_type,
          service_date: newReminder.service_date,
          odometer_km: selectedRule?.requires_odometer
            ? Number(newReminder.odometer_km)
            : null,
          notes: newReminder.notes || null,
        },
        getToken
      );

      setShowAddModal(false);
      setNewReminder({
        service_type: "",
        notes: "",
        service_date: todayISO(),
        odometer_km: "",
      });

      await loadReminders();
      Alert.alert("Success", "Maintenance added");
    } catch {
      Alert.alert("Error", "Failed to add maintenance");
    }
  };

  // ✏️ EDIT
  const handleEditPress = (item) => {
    setEditingReminder(item);
    setNewReminder({
      service_type: item.service_type,
      notes: item.notes || "",
      service_date: item.service_date,
      odometer_km: item.odometer_km
        ? item.odometer_km.toString()
        : "",
    });
    setShowAddModal(true);
  };

  // 💾 UPDATE
  const handleUpdateReminder = async () => {
    if (!editingReminder) return;

    if (
      selectedRule?.requires_odometer &&
      (!newReminder.odometer_km ||
        Number(newReminder.odometer_km) <= 0)
    ) {
      Alert.alert("Error", "Valid odometer required");
      return;
    }

    try {
      await updateMaintenance(
        editingReminder.id,
        {
          service_date: newReminder.service_date,
          odometer_km: selectedRule?.requires_odometer
            ? Number(newReminder.odometer_km)
            : null,
          notes: newReminder.notes || null,
        },
        getToken
      );

      setEditingReminder(null);
      setShowAddModal(false);

      setNewReminder({
        service_type: "",
        notes: "",
        service_date: todayISO(),
        odometer_km: "",
      });

      await loadReminders();
      Alert.alert("Success", "Maintenance updated");
    } catch {
      Alert.alert("Error", "Failed to update maintenance");
    }
  };

  // 🗑️ DELETE
  // 🗑️ DELETE (FIXED)
  const handleDeleteReminder = (id) => {
    Alert.alert(
      "Delete Maintenance",
      "Are you sure you want to delete this record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("DELETE CLICKED:", id);

            try {
              await deleteMaintenance(id, getToken);

              // ✅ OPTIMISTIC UI UPDATE
              setReminders((prev) =>
                prev.filter((item) => item.id !== id)
              );

              Alert.alert("Deleted", "Maintenance record deleted");
            } catch (err) {
              console.error("Delete failed:", err);
              Alert.alert("Error", "Failed to delete maintenance");
            }
          },
        },
      ]
    );
  };


  const renderReminder = ({ item }) => (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeader}>
        <Text style={styles.reminderTitle}>{item.service_type}</Text>

        {/* ✏️ 🗑️ ICONS */}
        <View
          style={{ flexDirection: "row", gap: 12, zIndex: 10 }}
          pointerEvents="box-none"
        >
          <TouchableOpacity onPress={() => handleEditPress(item)}>
            <Ionicons
              name="pencil-outline"
              size={20}
              color="#526D82"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteReminder(item.id)}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ zIndex: 20 }}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#FF6B6B"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.reminderDescription}>{item.notes || "—"}</Text>

      <View style={styles.reminderFooter}>
        <View style={styles.dueDateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#526D82" />
          <Text style={styles.dueDate}>
            {toDDMMYYYY(item.service_date)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Maintenance</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowProfileModal(true)}
          style={styles.profileBtn}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingReminder(null);
          setShowAddModal(true);
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>
                {editingReminder ? "Edit Maintenance" : "Add Maintenance"}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#27374D" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* SERVICE TYPE */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Service Type</Text>
                <View style={styles.input}>
                  <Picker
                    enabled={!editingReminder}
                    selectedValue={newReminder.service_type}
                    onValueChange={(v) =>
                      setNewReminder({
                        ...newReminder,
                        service_type: v,
                        odometer_km: "",
                      })
                    }
                  >
                    <Picker.Item label="Select service type" value="" />
                    {rules.map((r) => (
                      <Picker.Item
                        key={r.service_type}
                        label={r.display_name}
                        value={r.service_type}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* NOTES */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  value={newReminder.notes}
                  onChangeText={(t) =>
                    setNewReminder({ ...newReminder, notes: t })
                  }
                />
              </View>

              {/* SERVICE DATE */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Service Date</Text>
                <TextInput
                  style={styles.input}
                  editable={false}
                  value={toDDMMYYYY(newReminder.service_date)}
                />
              </View>

              {/* ODOMETER */}
              {selectedRule?.requires_odometer && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Odometer (km)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={newReminder.odometer_km}
                    onChangeText={(t) =>
                      setNewReminder({
                        ...newReminder,
                        odometer_km: t,
                      })
                    }
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={
                  editingReminder
                    ? handleUpdateReminder
                    : handleAddReminder
                }
              >
                <Text style={styles.submitButtonText}>
                  {editingReminder ? "Update" : "Save"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <View style={styles.profileModal}>
            <Text style={styles.profileModalName}>
              {user?.firstName} {user?.lastName}
            </Text>

            <TouchableOpacity
              style={styles.profileModalOption}
              onPress={async () => {
                setShowProfileModal(false);
                await signOut();
              }}
            >
              <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
              <Text style={[styles.profileModalOptionText, styles.logoutText]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES (UNCHANGED) ---------------- */


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#27374D",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  profileBtn: {
    padding: 4,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  listContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#27374D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(157, 178, 191, 0.1)",
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27374D",
    flex: 1,
  },
  reminderDescription: {
    fontSize: 15,
    color: "#526D82",
    marginBottom: 16,
    lineHeight: 22,
  },
  reminderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dueDate: {
    fontSize: 13,
    color: "#526D82",
    marginLeft: 6,
    fontWeight: "600",
  },
  addButton: {
    position: "absolute",
    right: 24,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#27374D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(39, 55, 77, 0.6)", // Darker, tinted overlay
    justifyContent: "flex-end",
  },
  addModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingTop: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  addModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  addModalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#27374D",
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#526D82",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#27374D",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#27374D",
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 40,
    shadowColor: "#27374D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 24,
  },
  profileModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  profileModalName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 20,
  },
  profileModalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  profileModalOptionText: {
    fontSize: 16,
    color: "#27374D",
    marginLeft: 16,
    fontWeight: "600",
  },
  logoutText: {
    color: "#FF6B6B",
  },
});