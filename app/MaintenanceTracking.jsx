import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function MaintenanceReminder() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  
  // Form state for new reminder
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium"
  });
  
  // Form state for editing reminder
  const [editReminder, setEditReminder] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium"
  });
  
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

  const handleAddReminder = () => {
    // Validate inputs
    if (!newReminder.title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    if (!newReminder.description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }
    if (!newReminder.dueDate.trim()) {
      Alert.alert("Error", "Please enter a due date (YYYY-MM-DD)");
      return;
    }

    // Add new reminder
    const reminder = {
      id: Date.now().toString(),
      title: newReminder.title,
      description: newReminder.description,
      dueDate: newReminder.dueDate,
      status: "upcoming",
      priority: newReminder.priority
    };

    setReminders([...reminders, reminder]);
    
    // Reset form and close modal
    setNewReminder({
      title: "",
      description: "",
      dueDate: "",
      priority: "medium"
    });
    setShowAddModal(false);
    
    Alert.alert("Success", "Reminder added successfully!");
  };

  const handleReminderPress = (item) => {
    setSelectedReminder(item);
    setShowOptionsModal(true);
  };

  const handleEditPress = () => {
    if (!selectedReminder) return;
    
    setEditReminder({
      title: selectedReminder.title,
      description: selectedReminder.description,
      dueDate: selectedReminder.dueDate,
      priority: selectedReminder.priority
    });
    setShowOptionsModal(false);
    setShowEditModal(true);
  };

  const handleUpdateReminder = () => {
    if (!selectedReminder) return;
    
    // Validate inputs
    if (!editReminder.title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    if (!editReminder.description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }
    if (!editReminder.dueDate.trim()) {
      Alert.alert("Error", "Please enter a due date (YYYY-MM-DD)");
      return;
    }

    // Update reminder
    const updatedReminders = reminders.map(reminder => 
      reminder.id === selectedReminder.id 
        ? {
            ...reminder,
            title: editReminder.title,
            description: editReminder.description,
            dueDate: editReminder.dueDate,
            priority: editReminder.priority
          }
        : reminder
    );

    setReminders(updatedReminders);
    setShowEditModal(false);
    setSelectedReminder(null);
    
    Alert.alert("Success", "Reminder updated successfully!");
  };

  const handleDeletePress = () => {
    if (!selectedReminder) return;
    
    setShowOptionsModal(false);
    
    Alert.alert(
      "Delete Reminder",
      "Are you sure you want to delete this reminder?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            const filteredReminders = reminders.filter(
              reminder => reminder.id !== selectedReminder.id
            );
            setReminders(filteredReminders);
            setSelectedReminder(null);
            Alert.alert("Success", "Reminder deleted successfully!");
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
      onPress={() => handleReminderPress(item)}
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

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Add New Reminder</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#27374D" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Oil Change"
                  value={newReminder.title}
                  onChangeText={(text) => setNewReminder({...newReminder, title: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter description"
                  value={newReminder.description}
                  onChangeText={(text) => setNewReminder({...newReminder, description: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-01-15"
                  value={newReminder.dueDate}
                  onChangeText={(text) => setNewReminder({...newReminder, dueDate: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityButtons}>
                  {["low", "medium", "high"].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        newReminder.priority === priority && styles.priorityButtonActive,
                        { borderColor: getPriorityColor(priority) }
                      ]}
                      onPress={() => setNewReminder({...newReminder, priority})}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        newReminder.priority === priority && { color: getPriorityColor(priority) }
                      ]}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleAddReminder}
              >
                <Text style={styles.submitButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Options Modal */}
      {selectedReminder && (
        <Modal
          visible={showOptionsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowOptionsModal(false)}
        >
          <TouchableOpacity
            style={styles.optionsModalOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsModal(false)}
          >
            <View style={styles.optionsModal}>
              <View style={styles.optionsModalHeader}>
                <Text style={styles.optionsModalTitle}>
                  {selectedReminder.title}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.optionsModalButton}
                onPress={handleEditPress}
              >
                <Ionicons name="create-outline" size={24} color="#27374D" />
                <Text style={styles.optionsModalButtonText}>Edit Reminder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionsModalButton, styles.deleteButton]}
                onPress={handleDeletePress}
              >
                <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                <Text style={[styles.optionsModalButtonText, styles.deleteButtonText]}>
                  Delete Reminder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowOptionsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Edit Reminder Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Edit Reminder</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color="#27374D" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Oil Change"
                  value={editReminder.title}
                  onChangeText={(text) => setEditReminder({...editReminder, title: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter description"
                  value={editReminder.description}
                  onChangeText={(text) => setEditReminder({...editReminder, description: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-01-15"
                  value={editReminder.dueDate}
                  onChangeText={(text) => setEditReminder({...editReminder, dueDate: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityButtons}>
                  {["low", "medium", "high"].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        editReminder.priority === priority && styles.priorityButtonActive,
                        { borderColor: getPriorityColor(priority) }
                      ]}
                      onPress={() => setEditReminder({...editReminder, priority})}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        editReminder.priority === priority && { color: getPriorityColor(priority) }
                      ]}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleUpdateReminder}
              >
                <Text style={styles.submitButtonText}>Update Reminder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity
          style={styles.profileModalOverlay}
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