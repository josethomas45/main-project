import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ChatHistory() {
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();

  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);

  /* ============================
     FETCH CHAT HISTORY
  ============================ */
  const loadChatHistory = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const res = await fetch(`${BACKEND_URL}/chat/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load chat history");
      }

      const data = await res.json();
      setChatHistory(data);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not load chat history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  /* ============================
     HELPERS
  ============================ */
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
      day: "numeric",
    });
  };

  const getFilteredChats = () => {
    if (!searchQuery.trim()) return chatHistory;

    const query = searchQuery.toLowerCase();
    return chatHistory.filter(
      (chat) =>
        chat.title?.toLowerCase().includes(query) ||
        chat.preview?.toLowerCase().includes(query) ||
        chat.lastMessage?.toLowerCase().includes(query)
    );
  };

  /* ============================
     ACTIONS
  ============================ */
  const handleChatPress = (chat) => {
    router.push({
      pathname: "/chat",
      params: { chatId: chat.id },
    });
  };

  const handleLogout = async () => {
    setShowProfileModal(false);
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  /* ============================
     RENDER ITEM
  ============================ */
  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => handleChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.chatIcon}>
        <Ionicons name="chatbubble" size={24} color="#27374D" />
      </View>

      <View style={styles.chatDetails}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.chatTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>

        <Text style={styles.chatPreview} numberOfLines={1}>
          {item.preview}
        </Text>

        <View style={styles.chatFooter}>
          <Ionicons name="chatbubbles-outline" size={14} color="#9DB2BF" />
          <Text style={styles.messageCountText}>
            {item.messageCount} messages
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  /* ============================
     UI
  ============================ */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Chat History</Text>

        <TouchableOpacity onPress={() => setShowProfileModal(true)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]?.toUpperCase() || "U"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9DB2BF" />
        <TextInput
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={getFilteredChats()}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 40 }}>
              No chat history
            </Text>
          }
        />
      )}

      {/* PROFILE MODAL */}
      <Modal transparent visible={showProfileModal} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowProfileModal(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.modalEmail}>
              {user?.primaryEmailAddress?.emailAddress}
            </Text>

            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logout}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// /* ============================
//    STYLES (unchanged)
// ============================ */
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#FFF" },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     padding: 16,
//     backgroundColor: "#27374D",
//     alignItems: "center",
//   },
//   headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "600" },
//   avatar: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: "#9DB2BF",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   avatarText: { color: "#27374D", fontWeight: "bold" },
//   searchBar: {
//     flexDirection: "row",
//     padding: 12,
//     alignItems: "center",
//     backgroundColor: "#F5F5F5",
//   },
//   searchInput: { marginLeft: 8, flex: 1 },
//   chatCard: {
//     flexDirection: "row",
//     padding: 14,
//     borderBottomWidth: 1,
//     borderColor: "#EEE",
//   },
//   chatIcon: {
//     marginRight: 12,
//     backgroundColor: "#DDE6ED",
//     padding: 10,
//     borderRadius: 20,
//   },
//   chatDetails: { flex: 1 },
//   chatHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   chatTitle: { fontWeight: "600" },
//   chatTime: { fontSize: 12, color: "#9DB2BF" },
//   chatPreview: { color: "#666", marginTop: 2 },
//   chatFooter: { flexDirection: "row", marginTop: 4 },
//   messageCountText: { marginLeft: 4, fontSize: 12, color: "#9DB2BF" },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.4)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modal: {
//     backgroundColor: "#FFF",
//     padding: 20,
//     borderRadius: 10,
//     width: "80%",
//   },
//   modalName: { fontWeight: "600", fontSize: 16 },
//   modalEmail: { color: "#666", marginBottom: 12 },
//   logout: { color: "#FF6B6B", marginTop: 10 },
// });

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