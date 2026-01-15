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
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={() => handleEditPress(item)}>
            <Ionicons
              name="pencil-outline"
              size={20}
              color="#526D82"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteReminder(item.id)}
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
          <Ionicons name="alarm-outline" size={24} color="#FFFFFF" />
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

      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={renderReminder}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

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
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#27374D",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  profileBtn: {
    padding: 4,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#9DB2BF",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reminderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27374D",
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  reminderDescription: {
    fontSize: 14,
    color: "#526D82",
    marginBottom: 12,
    lineHeight: 20,
  },
  reminderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueDate: {
    fontSize: 13,
    color: "#526D82",
    marginLeft: 6,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#27374D",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9DB2BF",
    marginTop: 8,
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  addModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  addModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  addModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#27374D",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27374D",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#27374D",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  priorityButtons: {
    flexDirection: "row",
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  priorityButtonActive: {
    backgroundColor: "#F5F5F5",
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9DB2BF",
  },
  submitButton: {
    backgroundColor: "#27374D",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 90,
    paddingRight: 20,
  },
  profileModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  profileModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileModalAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  profileModalInfo: {
    flex: 1,
  },
  profileModalName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 4,
  },
  profileModalEmail: {
    fontSize: 13,
    color: "#9DB2BF",
  },
  profileModalDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 12,
  },
  profileModalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  profileModalOptionText: {
    fontSize: 15,
    color: "#27374D",
    marginLeft: 12,
    fontWeight: "600",
  },
  logoutOption: {
    marginTop: 4,
  },
  logoutText: {
    color: "#FF6B6B",
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  optionsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
  },
  optionsModalHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27374D",
    textAlign: "center",
  },
  optionsModalButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    marginBottom: 12,
  },
  optionsModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27374D",
    marginLeft: 12,
  },
  deleteButton: {
    backgroundColor: "#FFF5F5",
  },
  deleteButtonText: {
    color: "#FF6B6B",
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    marginTop: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9DB2BF",
  },
});