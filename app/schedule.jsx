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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function Schedule() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [newSchedule, setNewSchedule] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    type: "maintenance",
  });

  // Sample schedule data - Replace with actual data from backend
  const [schedules, setSchedules] = useState([
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
  ]);

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

  const handleAddSchedule = () => {
    // Validate form
    if (!newSchedule.title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    if (!newSchedule.date.trim()) {
      Alert.alert("Error", "Please enter a date");
      return;
    }
    if (!newSchedule.time.trim()) {
      Alert.alert("Error", "Please enter a time");
      return;
    }

    // Add new schedule
    const newId = Math.max(...schedules.map(s => s.id)) + 1;
    const scheduleToAdd = {
      id: newId,
      ...newSchedule,
    };

    setSchedules([...schedules, scheduleToAdd]);
    
    // Reset form
    setNewSchedule({
      title: "",
      description: "",
      date: "",
      time: "",
      location: "",
      type: "maintenance",
    });
    
    setShowAddModal(false);
    Alert.alert("Success", "Schedule added successfully!");
  };

  const handleDeleteSchedule = (scheduleId, scheduleTitle) => {
    Alert.alert(
      "Delete Schedule",
      `Are you sure you want to delete "${scheduleTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setSchedules(schedules.filter(s => s.id !== scheduleId));
            Alert.alert("Success", "Schedule deleted successfully!");
          }
        }
      ]
    );
  };

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
            <View
              key={schedule.id}
              style={styles.scheduleCard}
            >
              <TouchableOpacity
                style={styles.scheduleCardContent}
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

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSchedule(schedule.id, schedule.title)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Add Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
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

      {/* Add Schedule Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.addModalOverlay}>
          <View style={styles.addModalContent}>
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Add New Schedule</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#27374D" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Oil Change"
                  placeholderTextColor="#9DB2BF"
                  value={newSchedule.title}
                  onChangeText={(text) => setNewSchedule({...newSchedule, title: text})}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add details..."
                  placeholderTextColor="#9DB2BF"
                  value={newSchedule.description}
                  onChangeText={(text) => setNewSchedule({...newSchedule, description: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Date Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Jan 25, 2026"
                  placeholderTextColor="#9DB2BF"
                  value={newSchedule.date}
                  onChangeText={(text) => setNewSchedule({...newSchedule, date: text})}
                />
              </View>

              {/* Time Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10:00 AM"
                  placeholderTextColor="#9DB2BF"
                  value={newSchedule.time}
                  onChangeText={(text) => setNewSchedule({...newSchedule, time: text})}
                />
              </View>

              {/* Location Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., AutoCare Center"
                  placeholderTextColor="#9DB2BF"
                  value={newSchedule.location}
                  onChangeText={(text) => setNewSchedule({...newSchedule, location: text})}
                />
              </View>

              {/* Type Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newSchedule.type === "service" && styles.typeButtonActive,
                      { borderColor: "#FF6B6B" }
                    ]}
                    onPress={() => setNewSchedule({...newSchedule, type: "service"})}
                  >
                    <Ionicons 
                      name="construct" 
                      size={20} 
                      color={newSchedule.type === "service" ? "#FF6B6B" : "#9DB2BF"} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      newSchedule.type === "service" && { color: "#FF6B6B" }
                    ]}>
                      Service
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newSchedule.type === "maintenance" && styles.typeButtonActive,
                      { borderColor: "#FFA500" }
                    ]}
                    onPress={() => setNewSchedule({...newSchedule, type: "maintenance"})}
                  >
                    <Ionicons 
                      name="settings" 
                      size={20} 
                      color={newSchedule.type === "maintenance" ? "#FFA500" : "#9DB2BF"} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      newSchedule.type === "maintenance" && { color: "#FFA500" }
                    ]}>
                      Maintenance
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newSchedule.type === "inspection" && styles.typeButtonActive,
                      { borderColor: "#4ECDC4" }
                    ]}
                    onPress={() => setNewSchedule({...newSchedule, type: "inspection"})}
                  >
                    <Ionicons 
                      name="search" 
                      size={20} 
                      color={newSchedule.type === "inspection" ? "#4ECDC4" : "#9DB2BF"} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      newSchedule.type === "inspection" && { color: "#4ECDC4" }
                    ]}>
                      Inspection
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddSchedule}
                >
                  <Text style={styles.saveButtonText}>Add Schedule</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
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
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  scheduleCardContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
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
  deleteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FF6B6B",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
    top: Platform.OS === "android" ? StatusBar.currentHeight + 70 : 110,
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
    fontSize: 11,
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

  // Add Schedule Modal
  addModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  addModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#27374D",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
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
  typeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: "#F5F5F5",
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9DB2BF",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#526D82",
  },
  saveButton: {
    backgroundColor: "#27374D",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});