import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SIDEBAR_WIDTH = Dimensions.get("window").width * 0.8;

export default function Sidebar({ visible, onClose, user, signOut, router, clearVehicle }) {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const menuItems = [
    {
      id: "dashboard",
      icon: "home-outline",
      label: "Dashboard",
      onPress: () => { router.push("dashboard"); onClose(); },
    },
    {
      id: "maintenance",
      icon: "build-outline",
      label: "Maintenance Tracking",
      onPress: () => { router.push("MaintenanceTracking"); onClose(); },
    },
    {
      id: "obd-issues",
      icon: "warning-outline",
      label: "Vehicle Issues",
      onPress: () => { router.push("OBDIssues"); onClose(); },
    },
    {
      id: "history",
      icon: "time-outline",
      label: "History",
      onPress: () => { router.push("HistoryPage"); onClose(); },
    },
    {
      id: "profile",
      icon: "person-outline",
      label: "Profile",
      onPress: () => { router.push("profile"); onClose(); },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sidebarContainer}>
        {/* Backdrop */}
        <TouchableOpacity style={styles.sidebarBackdrop} activeOpacity={1} onPress={onClose} />

        {/* Glass Sidebar */}
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sidebarAvatarRing}
            >
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>
                  {user?.firstName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            </LinearGradient>
            <Text style={styles.sidebarUserName}>
              {user?.firstName || "User"} {user?.lastName || ""}
            </Text>
            <Text style={styles.sidebarUserEmail}>
              {user?.primaryEmailAddress?.emailAddress || ""}
            </Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon} size={22} color="#a5b4fc" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <View style={styles.sidebarFooter}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => { clearVehicle?.(); signOut(); onClose(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sidebarContainer: { flex: 1, flexDirection: "row" },
  sidebarBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.85)" },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "rgba(30,41,59,0.95)",
    borderRightWidth: 1,
    borderRightColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  sidebarHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
  },
  sidebarAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    marginBottom: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  sidebarAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarAvatarText: { color: "#f1f5f9", fontSize: 36, fontWeight: "800" },
  sidebarUserName: { fontSize: 20, fontWeight: "700", color: "#f1f5f9", marginBottom: 4 },
  sidebarUserEmail: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },
  menuItems: { flex: 1, paddingTop: 24, paddingHorizontal: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "rgba(51,65,85,0.5)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 16, color: "#f1f5f9", fontWeight: "600" },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.1)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  logoutText: { fontSize: 16, color: "#ef4444", marginLeft: 12, fontWeight: "600" },
});
