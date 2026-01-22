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

      <View style={styles.content}>
        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9DB2BF" />
            <TextInput
              placeholder="Search conversations..."
              placeholderTextColor="#9DB2BF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* LIST */}
        {loading ? (
          <ActivityIndicator size="large" color="#27374D" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={getFilteredChats()}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#9DB2BF" />
                <Text style={styles.emptyText}>No conversation history</Text>
                <Text style={styles.emptySubtext}>
                  Start a new chat to see it here
                </Text>
              </View>
            }
          />
        )}
      </View>

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
    backgroundColor: "#27374D",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#27374D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#27374D",
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  chatCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#27374D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(157, 178, 191, 0.1)",
    alignItems: "center",
  },
  chatIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27374D",
    maxWidth: "70%",
  },
  chatTime: {
    fontSize: 12,
    color: "#9DB2BF",
    fontWeight: "600",
  },
  chatPreview: {
    fontSize: 14,
    color: "#526D82",
    marginBottom: 10,
    lineHeight: 20,
  },
  chatFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageCountText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#9DB2BF",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27374D",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9DB2BF",
    marginTop: 8,
    textAlign: "center",
  },
  // Modals use same style as Maintenance
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(39, 55, 77, 0.6)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    alignItems: "center",
  },
  modalName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#27374D",
    marginBottom: 4,
  },
  modalEmail: {
    fontSize: 14,
    color: "#526D82",
    marginBottom: 32,
  },
  logout: {
    color: "#FF6B6B",
    fontSize: 18,
    fontWeight: "700",
    padding: 10,
  },
});