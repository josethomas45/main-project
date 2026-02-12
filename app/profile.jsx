import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Reusable Glass Card Component
const GlassCard = ({ children, style, delay = 0 }) => {
  return (
    <Animated.View
      entering={FadeInUp.duration(700).delay(delay).springify()}
      style={[styles.glassCardWrapper, style]}
    >
      <View style={styles.glassCard}>
        {children}
      </View>
    </Animated.View>
  );
};

// Reusable List Row Component
const ListRow = ({ icon, label, value, onPress, editable, danger, last }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={!onPress}
        style={[styles.listRow, last && styles.listRowLast]}
      >
        <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
          <Ionicons
            name={icon}
            size={22}
            color={danger ? "#ef4444" : "#a5b4fc"}
          />
        </View>

        <View style={styles.rowTextContainer}>
          <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>
            {label}
          </Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        </View>

        {(editable || onPress) && (
          <Ionicons
            name={editable ? "pencil" : "chevron-forward"}
            size={20}
            color={danger ? "#ef4444" : "#94a3b8"}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function Profile() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState({ type: "", value: "", label: "" });

  const handleBack = () => router.back();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const handleEditField = (type, currentValue, label) => {
    setEditField({ type, value: currentValue || "", label });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    Alert.alert(
      "Coming Soon",
      `Editing ${editField.label} will be available soon. This would update your profile with: "${editField.value}"`
    );
    setShowEditModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Animated gradient background */}
      <LinearGradient
        colors={["#1e293b", "#0f172a", "#0f172a"]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={26} color="#f1f5f9" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Ionicons name="log-out-outline" size={24} color="#f1f5f9" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Section */}
        <Animated.View
          entering={ZoomIn.delay(300).duration(800).springify()}
          style={styles.heroSection}
        >
          <View style={styles.avatarContainer}>
            {/* Gradient ring */}
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.firstName?.[0] || "U").toUpperCase()}
                  {(user?.lastName?.[0] || "").toUpperCase()}
                </Text>
              </View>
            </LinearGradient>

            {/* Camera edit button */}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => Alert.alert("Coming Soon", "Avatar editing coming soon")}
            >
              <LinearGradient
                colors={["#6366f1", "#8b5cf6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cameraGradient}
              >
                <Ionicons name="camera" size={18} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.displayName}>
            {user?.firstName || "User"} {user?.lastName || ""}
          </Text>

          <Text style={styles.displayEmail}>
            {user?.primaryEmailAddress?.emailAddress || "No email"}
          </Text>

          {/* Verified badge */}
          {user?.primaryEmailAddress?.verification?.status === "verified" && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#6366f1" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </Animated.View>

        {/* Personal Information Card */}
        <GlassCard delay={400}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <ListRow
            icon="person-outline"
            label="First Name"
            value={user?.firstName || "Not set"}
            editable
            onPress={() =>
              handleEditField("firstName", user?.firstName, "First Name")
            }
          />
          <ListRow
            icon="person-outline"
            label="Last Name"
            value={user?.lastName || "Not set"}
            editable
            onPress={() => handleEditField("lastName", user?.lastName, "Last Name")}
          />
          <ListRow
            icon="mail-outline"
            label="Email"
            value={user?.primaryEmailAddress?.emailAddress || "Not set"}
          />
          <ListRow
            icon="call-outline"
            label="Phone Number"
            value={user?.primaryPhoneNumber?.phoneNumber || "Not set"}
            editable
            onPress={() =>
              handleEditField(
                "phone",
                user?.primaryPhoneNumber?.phoneNumber,
                "Phone Number"
              )
            }
            last
          />
        </GlassCard>

        {/* Account Information Card */}
        <GlassCard delay={500}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <ListRow
            icon="finger-print-outline"
            label="User ID"
            value={user?.id?.substring(0, 20) + "..." || "Not available"}
          />
          <ListRow
            icon="calendar-outline"
            label="Member Since"
            value={formatDate(user?.createdAt)}
          />
          <ListRow
            icon="shield-checkmark-outline"
            label="Email Verified"
            value={
              user?.primaryEmailAddress?.verification?.status === "verified"
                ? "Yes"
                : "No"
            }
            last
          />
        </GlassCard>

        {/* Preferences Card */}
        <GlassCard delay={600}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <ListRow
            icon="notifications-outline"
            label="Notifications"
            value="Enabled"
            onPress={() =>
              Alert.alert("Coming Soon", "Notification settings coming soon")
            }
          />
          <ListRow
            icon="moon-outline"
            label="Dark Mode"
            value="Enabled"
            onPress={() => Alert.alert("Coming Soon", "Theme settings coming soon")}
          />
          <ListRow
            icon="language-outline"
            label="Language"
            value="English"
            onPress={() =>
              Alert.alert("Coming Soon", "Language settings coming soon")
            }
            last
          />
        </GlassCard>

        {/* Danger Zone Card */}
        <GlassCard delay={700} style={styles.dangerCard}>
          <Text style={styles.sectionTitleDanger}>Danger Zone</Text>

          <ListRow
            icon="trash-outline"
            label="Delete Account"
            value="Permanently remove account"
            danger
            onPress={() =>
              Alert.alert(
                "Delete Account",
                "This action is permanent and will delete all your data.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete Account",
                    style: "destructive",
                    onPress: () =>
                      Alert.alert("Coming Soon", "Account deletion coming soon."),
                  },
                ]
              )
            }
            last
          />
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AutoVitals • v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setShowEditModal(false)}
          />

          <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editField.label}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{editField.label}</Text>
            <TextInput
              style={styles.textInput}
              value={editField.value}
              onChangeText={(text) => setEditField({ ...editField, value: text })}
              placeholder={`Enter ${editField.label.toLowerCase()}`}
              placeholderTextColor="#64748b"
              autoFocus
              autoCapitalize="words"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleSaveEdit}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#6366f1", "#8b5cf6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnSaveGradient}
                >
                  <Text style={styles.btnSaveText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
    height: SCREEN_HEIGHT * 0.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // ── Hero Section ──
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 42,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: -1,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 20,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0f172a",
  },
  displayName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  displayEmail: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99,102,241,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.3)",
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a5b4fc",
    letterSpacing: 0.3,
  },

  // ── Glass Card Component ──
  glassCardWrapper: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glassCard: {
    backgroundColor: "rgba(30,41,59,0.65)",
    padding: 20,
    backdropFilter: "blur(10px)",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  sectionTitleDanger: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f87171",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 16,
  },

  // ── List Row Component ──
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(165,180,252,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconContainerDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f1f5f9",
    marginBottom: 3,
  },
  rowLabelDanger: {
    color: "#ef4444",
  },
  rowValue: {
    fontSize: 14,
    color: "#94a3b8",
  },

  // ── Danger Card ──
  dangerCard: {
    borderColor: "rgba(239,68,68,0.2)",
  },

  // ── Footer ──
  footer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
    opacity: 0.5,
  },
  footerText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    letterSpacing: 0.5,
  },

  // ── Edit Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: "rgba(30,41,59,0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    overflow: "hidden",
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#475569",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: -0.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 10,
    letterSpacing: 0.3,
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
    marginBottom: 28,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(71,85,105,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  btnSave: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnSaveGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSaveText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});