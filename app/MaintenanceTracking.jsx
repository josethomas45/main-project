import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import {
  fetchMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from "@/utils/maintenance";

export default function MaintenanceReminder() {
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
  });

  const [editReminder, setEditReminder] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
  });

  /* ================= FETCH ================= */

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const res = await fetchMaintenance(getToken);
      setReminders(res.data || []);
    } catch {
      Alert.alert("Error", "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  /* ================= ADD ================= */

  const handleAddReminder = async () => {
    if (!newReminder.title || !newReminder.description || !newReminder.dueDate) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    try {
      await createMaintenance(
        {
          title: newReminder.title,
          description: newReminder.description,
          service_date: newReminder.dueDate,
          priority: newReminder.priority,
        },
        getToken
      );

      setShowAddModal(false);
      setNewReminder({ title: "", description: "", dueDate: "", priority: "medium" });
      loadReminders();
      Alert.alert("Success", "Reminder added");
    } catch {
      Alert.alert("Error", "Failed to add reminder");
    }
  };

  /* ================= EDIT ================= */

  const handleEditPress = () => {
    setEditReminder({
      title: selectedReminder.title,
      description: selectedReminder.description,
      dueDate: selectedReminder.service_date,
      priority: selectedReminder.priority,
    });
    setShowOptionsModal(false);
    setShowEditModal(true);
  };

  const handleUpdateReminder = async () => {
    try {
      await updateMaintenance(
        selectedReminder.id,
        {
          title: editReminder.title,
          description: editReminder.description,
          service_date: editReminder.dueDate,
          priority: editReminder.priority,
        },
        getToken
      );

      setShowEditModal(false);
      setSelectedReminder(null);
      loadReminders();
      Alert.alert("Updated", "Reminder updated");
    } catch {
      Alert.alert("Error", "Update failed");
    }
  };

  /* ================= DELETE ================= */

  const handleDeletePress = async () => {
    try {
      await deleteMaintenance(selectedReminder.id, getToken);
      setSelectedReminder(null);
      loadReminders();
      Alert.alert("Deleted", "Reminder removed");
    } catch {
      Alert.alert("Error", "Delete failed");
    }
  };

  /* ================= UI HELPERS ================= */

  const getPriorityColor = (priority) =>
    priority === "high" ? "#FF6B6B" : priority === "medium" ? "#FFA500" : "#4CAF50";

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const renderReminder = ({ item }) => (
    <TouchableOpacity
      style={styles.reminderCard}
      onPress={() => {
        setSelectedReminder(item);
        setShowOptionsModal(true);
      }}
    >
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTitleContainer}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
          <Text style={styles.reminderTitle}>{item.title}</Text>
        </View>
      </View>

      <Text style={styles.reminderDescription}>{item.description}</Text>

      <View style={styles.reminderFooter}>
        <View style={styles.dueDateContainer}>
          <Ionicons name="calendar-outline" size={16} />
          <Text style={styles.dueDate}>{formatDate(item.service_date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  /* ================= RENDER ================= */

  if (loading) {
    return <Text style={{ marginTop: 80, textAlign: "center" }}>Loading…</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={renderReminder}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* ADD MODAL */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <ScrollView>
              <TextInput placeholder="Title" style={styles.input}
                value={newReminder.title}
                onChangeText={(t) => setNewReminder({ ...newReminder, title: t })}
              />
              <TextInput placeholder="Description" style={styles.input}
                value={newReminder.description}
                onChangeText={(t) => setNewReminder({ ...newReminder, description: t })}
              />
              <TextInput placeholder="YYYY-MM-DD" style={styles.input}
                value={newReminder.dueDate}
                onChangeText={(t) => setNewReminder({ ...newReminder, dueDate: t })}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleAddReminder}>
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* OPTIONS */}
      {selectedReminder && (
        <Modal visible={showOptionsModal} transparent>
          <View style={styles.optionsModalOverlay}>
            <View style={styles.optionsModal}>
              <TouchableOpacity onPress={handleEditPress}>
                <Text>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeletePress}>
                <Text style={{ color: "red" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}


