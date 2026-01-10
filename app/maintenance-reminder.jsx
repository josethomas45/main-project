import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function MaintenanceReminder() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Sample maintenance reminders data
  const [reminders, setReminders] = useState([
    {
      id: "1",
      title: "Oil Change",
      description: "Regular engine oil change",
      dueDate: "2026-01-15",
      status: "upcoming",
      priority: "high",
    },
    {
      id: "2",
      title: "Tire Rotation",
      description: "Rotate tires for even wear",
      dueDate: "2026-01-20",
      status: "upcoming",
      priority: "medium",
    },
    {
      id: "3",
      title: "Brake Inspection",
      description: "Check brake pads and rotors",
      dueDate: "2026-02-01",
      status: "upcoming",
      priority: "high",
    },
    {
      id: "4",
      title: "Air Filter Replacement",
      description: "Replace cabin and engine air filters",
      dueDate: "2026-02-10",
      status: "upcoming",
      priority: "low",
    },
  ]);

  const handleBack = () => {
    router.back();
  };

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#FF6B6B";
      case "medium":
        return "#FFA500";
      case "low":
        return "#4CAF50";
      default:
        return "#9DB2BF";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  const renderReminder = ({ item }) => (
    <TouchableOpacity 
      style={styles.reminderCard}
      onPress={() => Alert.alert("Reminder Details", item.description)}
    >
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTitleContainer}>
          <View style={[
            styles.priorityDot,
            { backgroundColor: getPriorityColor(item.priority) }
          ]} />
          <Text style={styles.reminderTitle}>{item.title}</Text>
        </View>
        <View style={[
          styles.priorityBadge,
          { backgroundColor: getPriorityColor(item.priority) + "20" }
        ]}>
          <Text style={[
            styles.priorityText,
            { color: getPriorityColor(item.priority) }
          ]}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.reminderDescription}>{item.description}</Text>
      
      <View style={styles.reminderFooter}>
        <View style={styles.dueDateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#526D82" />
          <Text style={styles.dueDate}>{formatDate(item.dueDate)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9DB2BF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Ionicons name="alarm-outline" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Maintenance Reminders</Text>
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

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{reminders.length}</Text>
            <Text style={styles.statLabel}>Total Reminders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#FF6B6B" }]}>
              {reminders.filter(r => r.priority === "high").length}
            </Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>
        </View>

        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="alarm-outline" size={64} color="#9DB2BF" />
              <Text style={styles.emptyText}>No maintenance reminders</Text>
              <Text style={styles.emptySubtext}>
                Add your first reminder to get started
              </Text>
            </View>
          }
        />
      </View>

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
  modalOverlay: {
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
});