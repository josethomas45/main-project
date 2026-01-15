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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function ChatHistory() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  
  // Sample chat history data - in real app, fetch from backend
  const [chatHistory, setChatHistory] = useState([
    {
      id: "1",
      title: "Brake Issue Discussion",
      lastMessage: "Thank you! I'll get that checked at the workshop.",
      timestamp: "2026-01-14T10:30:00",
      messageCount: 8,
      preview: "My brakes are making a squeaking noise...",
    },
    {
      id: "2",
      title: "Oil Change Reminder",
      lastMessage: "Got it, I'll schedule it for next week.",
      timestamp: "2026-01-13T15:45:00",
      messageCount: 5,
      preview: "When should I get my next oil change?",
    },
    {
      id: "3",
      title: "Engine Light Problem",
      lastMessage: "Thanks for the detailed explanation!",
      timestamp: "2026-01-12T09:20:00",
      messageCount: 12,
      preview: "My check engine light came on yesterday...",
    },
    {
      id: "4",
      title: "Tire Pressure Check",
      lastMessage: "I'll check them this evening.",
      timestamp: "2026-01-11T14:15:00",
      messageCount: 4,
      preview: "How often should I check tire pressure?",
    },
    {
      id: "5",
      title: "Battery Replacement",
      lastMessage: "Perfect, I found a good workshop nearby.",
      timestamp: "2026-01-10T11:00:00",
      messageCount: 10,
      preview: "My car won't start in cold weather...",
    },
    {
      id: "6",
      title: "Air Filter Question",
      lastMessage: "That makes sense, thank you!",
      timestamp: "2026-01-09T16:30:00",
      messageCount: 6,
      preview: "How do I know when to replace my air filter?",
    },
    {
      id: "7",
      title: "Strange Noise Diagnosis",
      lastMessage: "I'll get it inspected tomorrow.",
      timestamp: "2026-01-08T13:45:00",
      messageCount: 15,
      preview: "There's a rattling sound when I accelerate...",
    },
    {
      id: "8",
      title: "Maintenance Schedule",
      lastMessage: "Great, I've saved the schedule.",
      timestamp: "2026-01-07T10:00:00",
      messageCount: 7,
      preview: "Can you help me plan my maintenance schedule?",
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

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });
  };

  const getFilteredChats = () => {
    if (!searchQuery.trim()) return chatHistory;
    
    const query = searchQuery.toLowerCase();
    return chatHistory.filter(chat => 
      chat.title.toLowerCase().includes(query) ||
      chat.preview.toLowerCase().includes(query) ||
      chat.lastMessage.toLowerCase().includes(query)
    );
  };

  const handleChatPress = (chat) => {
    // Navigate to chat with this conversation loaded
    Alert.alert("Open Chat", `Opening conversation: ${chat.title}\n\nIn a real app, this would load the full conversation.`);
  };

  const handleDeletePress = (chat, event) => {
    // Stop event propagation to prevent opening the chat
    if (event) {
      event.stopPropagation();
    }
    setSelectedChat(chat);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedChat) {
      const updatedHistory = chatHistory.filter(chat => chat.id !== selectedChat.id);
      setChatHistory(updatedHistory);
      setShowDeleteModal(false);
      setSelectedChat(null);
    }
  };

  const handleDeleteAll = () => {
    if (chatHistory.length === 0) return;
    
    Alert.alert(
      "Delete All Chats",
      "Are you sure you want to delete all chat history? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete All", 
          style: "destructive",
          onPress: () => {
            setChatHistory([]);
          }
        }
      ]
    );
  };

  const renderChatItem = ({ item }) => (
    <View style={styles.chatCard}>
      <TouchableOpacity 
        style={styles.chatContent}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chatIconContainer}>
          <View style={styles.chatIcon}>
            <Ionicons name="chatbubble" size={24} color="#27374D" />
          </View>
        </View>
        
        <View style={styles.chatDetails}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.chatTime}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.preview}
          </Text>
          
          <View style={styles.chatFooter}>
            <View style={styles.messageCount}>
              <Ionicons name="chatbubbles-outline" size={14} color="#9DB2BF" />
              <Text style={styles.messageCountText}>{item.messageCount} messages</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteBtn}
        onPress={(e) => {
          e.preventDefault();
          handleDeletePress(item, e);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Ionicons name="time-outline" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Chat History</Text>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9DB2BF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9DB2BF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{chatHistory.length}</Text>
          <Text style={styles.statLabel}>Total Chats</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
            {chatHistory.reduce((sum, chat) => sum + chat.messageCount, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Messages</Text>
        </View>
      </View>

      {/* Delete All Button */}
      {chatHistory.length > 0 && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.deleteAllBtn}
            onPress={handleDeleteAll}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            <Text style={styles.deleteAllText}>Delete All Chats</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat History List */}
      <FlatList
        data={getFilteredChats()}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#9DB2BF" />
            <Text style={styles.emptyText}>No chat history</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? "No conversations match your search" : "Your conversations will appear here"}
            </Text>
          </View>
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
            </View>
            
            <Text style={styles.deleteModalTitle}>Delete Chat?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{selectedChat?.title}"? This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedChat(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmDeleteBtn}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#27374D",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#9DB2BF",
    fontWeight: "600",
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  deleteAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  deleteAllText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  chatCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chatContent: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
  },
  chatIconContainer: {
    marginRight: 12,
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27374D",
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: "#9DB2BF",
    fontWeight: "600",
  },
  chatPreview: {
    fontSize: 14,
    color: "#526D82",
    marginBottom: 8,
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  messageCountText: {
    fontSize: 12,
    color: "#9DB2BF",
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
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
    textAlign: "center",
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  deleteModalIcon: {
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: "#526D82",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27374D",
  },
  confirmDeleteBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
  },
  confirmDeleteBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
});