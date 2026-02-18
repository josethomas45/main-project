import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

import {
  createMaintenance,
  deleteMaintenance,
  fetchMaintenance,
  fetchMaintenanceRules,
  updateMaintenance,
} from "../utils/maintenance";
import { useVehicle } from "../contexts/VehicleContext";
import Sidebar from "../components/Sidebar";



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
  const { currentVehicle, clearVehicle } = useVehicle();

  const [rules, setRules] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
      (!newReminder.odometer_km || Number(newReminder.odometer_km) <= 0)
    ) {
      Alert.alert("Error", "Odometer reading required");
      return;
    }

    try {
      await createMaintenance(
        {
          vehicle_id: currentVehicle?.id,
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

  const handleEditPress = (item) => {
    setEditingReminder(item);
    setNewReminder({
      service_type: item.service_type,
      notes: item.notes || "",
      service_date: item.service_date,
      odometer_km: item.odometer_km ? item.odometer_km.toString() : "",
    });
    setShowAddModal(true);
  };

  const handleUpdateReminder = async () => {
    if (!editingReminder) return;

    if (
      selectedRule?.requires_odometer &&
      (!newReminder.odometer_km || Number(newReminder.odometer_km) <= 0)
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
            try {
              await deleteMaintenance(id, getToken);
              setReminders((prev) => prev.filter((item) => item.id !== id));
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

  const renderReminder = ({ item, index }) => {
    return (
      <Animated.View
        entering={FadeInUp.duration(600).delay(100 + index * 60).springify()}
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleEditPress(item)}
        >
          <View style={styles.reminderCard}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              <View style={styles.serviceHeaderRow}>
                {/* Icon with gradient */}
                <LinearGradient
                  colors={["#6366f1", "#8b5cf6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.serviceIcon}
                >
                  <Ionicons name="build" size={20} color="#ffffff" />
                </LinearGradient>

                <Text style={styles.serviceType} numberOfLines={1}>
                  {item.service_type}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteReminder(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Notes */}
            {item.notes && (
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            )}

            {/* Footer badges */}
            <View style={styles.cardFooter}>
              <View style={styles.badge}>
                <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                <Text style={styles.badgeText}>{toDDMMYYYY(item.service_date)}</Text>
              </View>

              {item.odometer_km && (
                <View style={styles.badge}>
                  <Ionicons name="speedometer-outline" size={14} color="#94a3b8" />
                  <Text style={styles.badgeText}>{item.odometer_km} km</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient */}
      <LinearGradient
        colors={["#1e293b", "#0f172a", "#0f172a"]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        {/* Sidebar menu button */}
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.headerButton}>
          <Ionicons name="menu" size={26} color="#f1f5f9" />
        </TouchableOpacity>
        {/* Back button commented out
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={26} color="#f1f5f9" />
        </TouchableOpacity>
        */}

        <Text style={styles.headerTitle}>Maintenance</Text>

        {/* Avatar with gradient ring */}
        <TouchableOpacity onPress={() => setShowProfileModal(true)}>
          <Animated.View entering={ZoomIn.delay(300).duration(600).springify()}>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Content area */}
      <View style={styles.contentArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Animated.View entering={ZoomIn.duration(700)}>
              <Ionicons name="car-sport" size={64} color="#475569" />
            </Animated.View>
          </View>
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            renderItem={renderReminder}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Animated.View
                entering={FadeInUp.duration(700).delay(200)}
                style={styles.emptyState}
              >
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="build-outline" size={64} color="#475569" />
                </View>
                <Text style={styles.emptyTitle}>No maintenance records</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first service reminder using the + button
                </Text>
              </Animated.View>
            }
          />
        )}
      </View>

      {/* Floating Add Button */}
      <Animated.View entering={ZoomIn.delay(500).duration(700).springify()} style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEditingReminder(null);
            setNewReminder({
              service_type: "",
              notes: "",
              service_date: todayISO(),
              odometer_km: "",
            });
            setShowAddModal(true);
          }}
        >
          <LinearGradient
            colors={["#6366f1", "#8b5cf6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={32} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Add / Edit Modal – Glass Bottom Sheet */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.backdropTouchable}
              activeOpacity={1}
              onPress={() => setShowAddModal(false)}
            />

            <Animated.View entering={FadeInUp.duration(400)} style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.modalTitle}>
              {editingReminder ? "Edit Record" : "New Maintenance"}
            </Text>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Service Type */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Service Type</Text>
                <View style={styles.pickerContainer}>
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
                    style={styles.picker}
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

              {/* Notes */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Notes / Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  multiline
                  placeholder="Any additional details..."
                  placeholderTextColor="#64748b"
                  value={newReminder.notes}
                  onChangeText={(t) => setNewReminder({ ...newReminder, notes: t })}
                />
              </View>

              {/* Date (display only) */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Service Date</Text>
                <View style={styles.readonlyInput}>
                  <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
                  <Text style={styles.readonlyText}>
                    {toDDMMYYYY(newReminder.service_date)}
                  </Text>
                </View>
              </View>

              {/* Odometer – conditional */}
              {selectedRule?.requires_odometer && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Odometer Reading (km)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="Current mileage"
                    placeholderTextColor="#64748b"
                    value={newReminder.odometer_km}
                    onChangeText={(t) =>
                      setNewReminder({ ...newReminder, odometer_km: t })
                    }
                  />
                </View>
              )}

              {/* Save button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingReminder ? handleUpdateReminder : handleAddReminder}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#6366f1", "#8b5cf6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingReminder ? "Update Record" : "Save Reminder"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Quick Menu – Glass */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.profileBackdrop}>
          <TouchableOpacity
            style={styles.profileBackdropTouch}
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
          />

          <Animated.View entering={FadeInDown.duration(400)} style={styles.profileMenu}>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileAvatarSmall}
            >
              <View style={styles.profileAvatarInner}>
                <Text style={styles.profileAvatarText}>
                  {user?.firstName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            </LinearGradient>

            <Text style={styles.profileName}>
              {user?.firstName} {user?.lastName}
            </Text>

            <Text style={styles.profileEmail}>
              {user?.primaryEmailAddress?.emailAddress}
            </Text>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowProfileModal(false);
                router.push("/profile");
              }}
            >
              <Ionicons name="person-outline" size={20} color="#a5b4fc" />
              <Text style={styles.menuItemText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={async () => {
                setShowProfileModal(false);
                await signOut();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Sidebar */}
      {sidebarVisible && (
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          user={user}
          signOut={signOut}
          router={router}
          clearVehicle={clearVehicle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
    letterSpacing: 0.3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2.5,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "800",
  },

  // ── Content Area ──
  contentArea: {
    flex: 1,
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // ── Glass Maintenance Card ──
  cardWrapper: {
    marginBottom: 16,
  },
  reminderCard: {
    backgroundColor: "rgba(30,41,59,0.65)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 20,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(51,65,85,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    color: "#cbd5e1",
    fontWeight: "600",
  },

  // ── FAB ──
  fabContainer: {
    position: "absolute",
    right: 24,
    bottom: 52,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Loading & Empty ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Add/Edit Modal (Glass Bottom Sheet) ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: "rgba(30,41,59,0.98)",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    minHeight: "55%",
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#475569",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  modalScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  formField: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  pickerContainer: {
    backgroundColor: "rgba(30,41,59,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    overflow: "hidden",
  },
  picker: {
    color: "#f1f5f9",
  },
  textInput: {
    backgroundColor: "rgba(30,41,59,0.8)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: "#f1f5f9",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  readonlyInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,41,59,0.5)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    gap: 10,
  },
  readonlyText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Profile Quick Menu (Glass) ──
  profileBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.75)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 110,
    paddingRight: 20,
  },
  profileBackdropTouch: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileMenu: {
    backgroundColor: "rgba(30,41,59,0.95)",
    borderRadius: 24,
    padding: 20,
    width: 280,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    alignItems: "center",
  },
  profileAvatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2.5,
    marginBottom: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  profileAvatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#f1f5f9",
    fontSize: 24,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 16,
  },
  menuDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(148,163,184,0.15)",
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(99,102,241,0.12)",
    marginBottom: 8,
  },
  menuItemText: {
    color: "#a5b4fc",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
  },
});