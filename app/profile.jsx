import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function Profile() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState({ type: "", value: "", label: "" });

  const handleBack = () => {
    router.back();
  };

  const handleLogout = async () => {
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

  const handleEditField = (type, currentValue, label) => {
    setEditField({ type, value: currentValue || "", label });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    // In a real app, update user profile via API
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
      year: "numeric" 
    });
  };

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        {
          icon: "person-outline",
          label: "First Name",
          value: user?.firstName || "Not set",
          editable: true,
          type: "firstName"
        },
        {
          icon: "person-outline",
          label: "Last Name",
          value: user?.lastName || "Not set",
          editable: true,
          type: "lastName"
        },
        {
          icon: "mail-outline",
          label: "Email",
          value: user?.primaryEmailAddress?.emailAddress || "Not set",
          editable: false,
          type: "email"
        },
        {
          icon: "call-outline",
          label: "Phone Number",
          value: user?.primaryPhoneNumber?.phoneNumber || "Not set",
          editable: true,
          type: "phone"
        },
      ]
    },
    {
      title: "Account Information",
      items: [
        {
          icon: "finger-print-outline",
          label: "User ID",
          value: user?.id?.substring(0, 20) + "..." || "Not available",
          editable: false,
          type: "userId"
        },
        {
          icon: "calendar-outline",
          label: "Member Since",
          value: formatDate(user?.createdAt),
          editable: false,
          type: "createdAt"
        },
        {
          icon: "shield-checkmark-outline",
          label: "Email Verified",
          value: user?.primaryEmailAddress?.verification?.status === "verified" ? "Yes" : "No",
          editable: false,
          type: "verified"
        },
      ]
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "notifications-outline",
          label: "Notifications",
          value: "Enabled",
          editable: false,
          type: "notifications",
          action: true
        },
        {
          icon: "moon-outline",
          label: "Dark Mode",
          value: "Disabled",
          editable: false,
          type: "darkMode",
          action: true
        },
        {
          icon: "language-outline",
          label: "Language",
          value: "English",
          editable: false,
          type: "language",
          action: true
        },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Profile</Text>
        
        <TouchableOpacity 
          onPress={handleLogout} 
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
                {user?.lastName?.charAt(0)?.toUpperCase() || ""}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editAvatarBtn}
              onPress={() => Alert.alert("Coming Soon", "Avatar editing will be available soon!")}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.profileName}>
            {user?.firstName || "User"} {user?.lastName || ""}
          </Text>
          <Text style={styles.profileEmail}>
            {user?.primaryEmailAddress?.emailAddress || "No email"}
          </Text>
        </View>

        {/* Profile Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.profileItem,
                    itemIndex === section.items.length - 1 && styles.profileItemLast
                  ]}
                  onPress={() => {
                    if (item.editable) {
                      handleEditField(item.type, item.value, item.label);
                    } else if (item.action) {
                      Alert.alert("Coming Soon", `${item.label} settings will be available soon!`);
                    }
                  }}
                  disabled={!item.editable && !item.action}
                >
                  <View style={styles.profileItemLeft}>
                    <View style={styles.profileItemIcon}>
                      <Ionicons name={item.icon} size={20} color="#27374D" />
                    </View>
                    <View style={styles.profileItemText}>
                      <Text style={styles.profileItemLabel}>{item.label}</Text>
                      <Text 
                        style={styles.profileItemValue}
                        numberOfLines={1}
                      >
                        {item.value}
                      </Text>
                    </View>
                  </View>
                  
                  {(item.editable || item.action) && (
                    <Ionicons 
                      name={item.editable ? "pencil" : "chevron-forward"} 
                      size={20} 
                      color="#9DB2BF" 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.dangerItem}
              onPress={() => {
                Alert.alert(
                  "Delete Account",
                  "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Delete Account", 
                      style: "destructive",
                      onPress: () => {
                        Alert.alert("Coming Soon", "Account deletion will be available soon. Please contact support if you need to delete your account.");
                      }
                    }
                  ]
                );
              }}
            >
              <View style={styles.profileItemLeft}>
                <View style={[styles.profileItemIcon, styles.dangerIcon]}>
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </View>
                <View style={styles.profileItemText}>
                  <Text style={[styles.profileItemLabel, styles.dangerText]}>
                    Delete Account
                  </Text>
                  <Text style={styles.profileItemValue}>
                    Permanently delete your account
                  </Text>
                </View>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>AutoVitals</Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit {editField.label}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color="#27374D" />
              </TouchableOpacity>
            </View>

            <View style={styles.editModalContent}>
              <Text style={styles.inputLabel}>{editField.label}</Text>
              <TextInput
                style={styles.input}
                value={editField.value}
                onChangeText={(text) => setEditField({ ...editField, value: text })}
                placeholder={`Enter ${editField.label.toLowerCase()}`}
                autoFocus
              />
            </View>

            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
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
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  logoutBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "700",
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#9DB2BF",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9DB2BF",
    textTransform: "uppercase",
    marginBottom: 8,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: "#FFFFFF",
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  profileItemLast: {
    borderBottomWidth: 0,
  },
  profileItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileItemText: {
    flex: 1,
  },
  profileItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27374D",
    marginBottom: 2,
  },
  profileItemValue: {
    fontSize: 13,
    color: "#9DB2BF",
  },
  dangerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  dangerIcon: {
    backgroundColor: "#FFF5F5",
  },
  dangerText: {
    color: "#FF6B6B",
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 32,
  },
  appInfoText: {
    fontSize: 14,
    color: "#9DB2BF",
    fontWeight: "600",
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 12,
    color: "#C0C0C0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  editModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#27374D",
  },
  editModalContent: {
    marginBottom: 24,
  },
  inputLabel: {
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
  editModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27374D",
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#27374D",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});