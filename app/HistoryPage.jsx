import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ChatHistory() {
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();

  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /* ============================
     FETCH CHAT HISTORY
  ============================ */
  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load chat history");
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
     HELPERS & ACTIONS
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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const handleChatPress = (chat) => {
    router.push({ pathname: "/chat", params: { chatId: chat.id } });
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
  const renderChatItem = ({ item, index }) => {
    return (
      <Animated.View
        entering={FadeInUp.duration(600).delay(100 + index * 50).springify()}
        style={styles.chatCardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleChatPress(item)}
        >
          <View style={styles.chatCard}>
            {/* Icon container with gradient */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={["#6366f1", "#8b5cf6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="chatbubble-ellipses" size={24} color="#ffffff" />
              </LinearGradient>
            </View>

            {/* Chat content */}
            <View style={styles.chatContent}>
              <View style={styles.chatHeaderRow}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {item.title || "Untitled Chat"}
                </Text>
                <Text style={styles.chatTimestamp}>
                  {formatTimestamp(item.timestamp)}
                </Text>
              </View>

              <Text style={styles.chatPreview} numberOfLines={2}>
                {item.preview || item.lastMessage || "No messages yet"}
              </Text>

              <View style={styles.chatMeta}>
                <Ionicons name="chatbubbles-outline" size={13} color="#94a3b8" />
                <Text style={styles.messageCount}>
                  {item.messageCount || 0} messages
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  /* ============================
     UI
  ============================ */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient */}
      <LinearGradient
        colors={["#1e293b", "#0f172a", "#0f172a"]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={26} color="#f1f5f9" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Conversations</Text>

        {/* Avatar button with gradient ring */}
        <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.avatarButton}>
          <Animated.View entering={ZoomIn.delay(300).duration(600).springify()}>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>
                  {user?.firstName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Content area */}
      <View style={styles.contentArea}>
        {/* Glass Search Bar */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.searchWrapper}
        >
          <View style={styles.glassSearchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              placeholder="Search conversations..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Chat List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <FlatList
            data={getFilteredChats()}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Animated.View
                entering={FadeInUp.duration(700).delay(200)}
                style={styles.emptyState}
              >
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#475569" />
                </View>
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start chatting to see your history appear here
                </Text>
              </Animated.View>
            }
          />
        )}
      </View>

      {/* Profile Modal – Glass Bottom Sheet */}
      <Modal
        transparent
        visible={showProfileModal}
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
          />

          <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.profileSheet}>
            <View style={styles.sheetHandle} />

            {/* Profile header with gradient avatar */}
            <View style={styles.profileHeader}>
              <LinearGradient
                colors={["#6366f1", "#8b5cf6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.largeAvatarRing}
              >
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>
                    {user?.firstName?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.profileEmail}>
                  {user?.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            </View>

            {/* View Profile Button */}
            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={() => {
                setShowProfileModal(false);
                router.push("/profile");
              }}
            >
              <Ionicons name="person-outline" size={20} color="#a5b4fc" />
              <Text style={styles.viewProfileText}>View Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
    letterSpacing: 0.3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2.5,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "800",
  },

  // ── Content Area ──
  contentArea: {
    flex: 1,
    paddingTop: 16,
  },

  // ── Glass Search Bar ──
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  glassSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,41,59,0.65)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#f1f5f9",
    fontWeight: "500",
  },

  // ── Chat List ──
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  chatCardWrapper: {
    marginBottom: 16,
  },
  chatCard: {
    flexDirection: "row",
    backgroundColor: "rgba(30,41,59,0.65)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  // ── Icon with Gradient ──
  iconWrapper: {
    marginRight: 14,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Chat Content ──
  chatContent: {
    flex: 1,
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
    flex: 1,
    marginRight: 12,
  },
  chatTimestamp: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  chatPreview: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 20,
    marginBottom: 10,
  },
  chatMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  messageCount: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },

  // ── Empty State ──
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Profile Modal (Glass Bottom Sheet) ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  profileSheet: {
    backgroundColor: "rgba(30,41,59,0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#475569",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 28,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  largeAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    marginRight: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  largeAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 33,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  largeAvatarText: {
    color: "#f1f5f9",
    fontSize: 32,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  viewProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(99,102,241,0.12)",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
  },
  viewProfileText: {
    flex: 1,
    color: "#a5b4fc",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
});