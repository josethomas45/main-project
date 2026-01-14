import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function Schedule() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = async () => {
    setShowProfileModal(false);
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
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
          }
        }
      ]
    );
  };

  // Sample schedule data - Replace with actual data from backend
  const schedules = [
    {
      id: 1,
      title: "Service Appointment",
      description: "Annual maintenance checkup",
      date: "Jan 25, 2026",
      time: "10:00 AM",
      location: "AutoCare Center",
      type: "service",
    },
    {
      id: 2,
      title: "Oil Change",
      description: "Regular engine oil change",
      date: "Feb 5, 2026",
      time: "2:00 PM",
      location: "Quick Lube Station",
      type: "maintenance",
    },
    {
      id: 3,
      title: "Tire Rotation",
      description: "Rotate tires for even wear",
      date: "Feb 15, 2026",
      time: "11:30 AM",
      location: "Tire Shop",
      type: "maintenance",
    },
    {
      id: 4,
      title: "Brake Inspection",
      description: "Check brake pads and rotors",
      date: "Mar 1, 2026",
      time: "9:00 AM",
      location: "Brake Specialists",
      type: "inspection",
    },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case "service":
        return "#FF6B6B";
      case "maintenance":
        return "#FFA500";
      case "inspection":
        return "#4ECDC4";
      default:
        return "#9DB2BF";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "service":
        return "construct";
      case "maintenance":
        return "settings";
      case "inspection":
        return "search";
      default:
        return "calendar";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#27374D" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Schedule</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowProfileModal(true)}
          style={styles.profileBtn}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.firstName?.charAt(0) || "U"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{schedules.length}</Text>
            <Text style={styles.statLabel}>Total Schedules</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Schedule List */}
        <View style={styles.scheduleList}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

          {schedules.map((schedule) => (
            <TouchableOpacity
              key={schedule.id}
              style={styles.scheduleCard}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.scheduleTypeIndicator,
                  { backgroundColor: getTypeColor(schedule.type) },
                ]}
              />

              <View style={styles.scheduleContent}>
                <View style={styles.scheduleHeader}>
                  <View
                    style={[
                      styles.scheduleIconContainer,
                      { backgroundColor: getTypeColor(schedule.type) + "20" },
                    ]}
                  >
                    <Ionicons
                      name={getTypeIcon(schedule.type)}
                      size={20}
                      color={getTypeColor(schedule.type)}
                    />
                  </View>
                  <View style={styles.scheduleTitleContainer}>
                    <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                    <Text style={styles.scheduleDescription}>
                      {schedule.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.scheduleDetails}>
                  <View style={styles.scheduleDetailItem}>
                    <Ionicons name="calendar" size={16} color="#526D82" />
                    <Text style={styles.scheduleDetailText}>
                      {schedule.date}
                    </Text>
                  </View>

                  <View style={styles.scheduleDetailItem}>
                    <Ionicons name="time" size={16} color="#526D82" />
                    <Text style={styles.scheduleDetailText}>
                      {schedule.time}
                    </Text>
                  </View>

                  <View style={styles.scheduleDetailItem}>
                    <Ionicons name="location" size={16} color="#526D82" />
                    <Text style={styles.scheduleDetailText}>
                      {schedule.location}
                    </Text>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#9DB2BF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add New Schedule</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <View style={styles.profileModal}>
            <View style={styles.profileModalHeader}>
              <View style={styles.profileModalAvatar}>
                <Text style={styles.profileModalAvatarText}>
                  {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <View style={styles.profileModalInfo}>
                <Text style={styles.profileModalName}>
                  {user?.firstName || "User"} {user?.lastName || ""}
                </Text>
                <Text style={styles.profileModalEmail}>
                  {user?.primaryEmailAddress?.emailAddress || "No email"}
                </Text>
              </View>
            </View>

            <View style={styles.profileModalDivider} />

            <TouchableOpacity 
              style={styles.profileModalOption}
              onPress={() => {
                setShowProfileModal(false);
                Alert.alert("Coming Soon", "Profile settings will be available soon!");
              }}
            >
              <Ionicons name="person-outline" size={24} color="#27374D" />
              <Text style={styles.profileModalOptionText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.profileModalOption}
              onPress={() => {
                setShowProfileModal(false);
                Alert.alert("Coming Soon", "Settings will be available soon!");
              }}
            >
              <Ionicons name="settings-outline" size={24} color="#27374D" />
              <Text style={styles.profileModalOptionText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.profileModalOption, styles.logoutOption]}
              onPress={handleLogout}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#27374D",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 60,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
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
  statsCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#9DB2BF",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
  },
  scheduleList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 16,
  },
  scheduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleTypeIndicator: {
    width: 4,
    height: "100%",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  scheduleContent: {
    flex: 1,
    marginLeft: 12,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  scheduleTitleContainer: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 2,
  },
  scheduleDescription: {
    fontSize: 13,
    color: "#9DB2BF",
  },
  scheduleDetails: {
    gap: 6,
  },
  scheduleDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scheduleDetailText: {
    fontSize: 13,
    color: "#526D82",
  },
  addButton: {
    backgroundColor: "#27374D",
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Profile Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  profileModal: {
    position: "absolute",
    top: 90,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: 250,
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
});