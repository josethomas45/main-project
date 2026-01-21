import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getDeviceLocation } from "../utils/location";
import { fetchWorkshops } from "../utils/workshops";

/* =====================
   ENV GUARD
===================== */
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("EXPO_PUBLIC_BACKEND_URL is missing. Check your .env file.");
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

/* =====================
   HELPERS
===================== */
function timeNow() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =====================
   FORMAT AGENT RESPONSE
===================== */
function formatAIResponse(data) {
  let text = "";

  if (data.diagnosis) {
    text += ` Diagnosis:\n${data.diagnosis}\n\n`;
  }

  if (data.explanation) {
    text += ` Explanation:\n${data.explanation}\n\n`;
  }

  if (Array.isArray(data.steps) && data.steps.length > 0) {
    text += "🛠️ Suggested Steps:\n";
    data.steps.forEach((s, i) => {
      text += `${i + 1}. ${s}\n`;
    });
    text += "\n";
  }

  if (
    Array.isArray(data.follow_up_questions) &&
    data.follow_up_questions.length > 0
  ) {
    text += " Follow-up Questions:\n";
    data.follow_up_questions.forEach((q, i) => {
      text += `${i + 1}. ${q}\n`;
    });
    text += "\n";
  }

  if (typeof data.severity === "number") {
    text += `⚠️ Severity: ${Math.round(data.severity * 100)}%\n`;
  }

  return text.trim() || "⚠️ No response from agent";
}

/* =====================
   SIDEBAR COMPONENT
===================== */
function Sidebar({ visible, onClose, user, signOut, router }) {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: Platform.OS !== "web", // 🔧 FIX: native driver breaks on web
    }).start();
  }, [visible]);

  const menuItems = [
    {
      id: "maintenance",
      icon: "build-outline",
      label: "Maintenance Tracking",
      onPress: () => {
        if (Platform.OS === "web") {
          document.activeElement?.blur(); // 🔧 FIX
        }
        router.push("MaintenanceTracking");
        onClose();
      },
    },
    {
      id: "history",
      icon: "time-outline",
      label: "History",
      onPress: () => {
        if (Platform.OS === "web") {
          document.activeElement?.blur(); // 🔧 FIX
        }
        router.push("HistoryPage");
        onClose();
      },
    },
    {
      id: "profile",
      icon: "person-outline",
      label: "Profile",
      onPress: () => {
        if (Platform.OS === "web") {
          document.activeElement?.blur(); // 🔧 FIX
        }
        router.push("profile");
        onClose();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.sidebarContainer}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            if (Platform.OS === "web") {
              document.activeElement?.blur(); // 🔧 FIX
            }
            onClose();
          }}
        />

        <Animated.View
          style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
        >
          <View style={styles.sidebarHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.[0] || "U"}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>
                  {user?.firstName || "User"} {user?.lastName || ""}
                </Text>
                <Text style={styles.userEmail}>
                  {user?.primaryEmailAddress?.emailAddress || ""}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.menuItems}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <Ionicons name={item.icon} size={22} color="#27374D" />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                if (Platform.OS === "web") {
                  document.activeElement?.blur(); // 🔧 FIX
                }
                signOut();
                onClose();
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="#E74C3C" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* =====================
   COMPONENT
===================== */

export default function Chat() {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { chatId } = useLocalSearchParams();
  useEffect(() => {
    if (Platform.OS === "web") {
      document.activeElement?.blur();
    }
  }, []);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: `Hi ${user?.firstName || "there"} , How can I help you today?`,
      timestamp: timeNow(),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const flatListRef = useRef(null);
  const msgCounter = useRef(0);
  const genId = () => `msg-${Date.now()}-${++msgCounter.current}`;

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  /* =====================
     LOAD EXISTING CHAT
  ===================== */
  useEffect(() => {
    if (!chatId) return;

    const loadChat = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        console.log("🚀 Loading chat:", chatId);

        const res = await fetch(`${BACKEND_URL}/chat/${chatId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.warn("Failed to load chat", chatId);
          return;
        }

        const data = await res.json();

        console.log("FULL chat response:", data);

        if (Array.isArray(data)) {
          const normalized = data.flatMap((row, index) => {
            const items = [];

            if (row.prompt) {
              items.push({
                id: `user-${index}`,
                sender: "user",
                text: row.prompt,
                timestamp: timeNow(),
              });
            }

            if (row.response_ai) {
              items.push({
                id: `ai-${index}`,
                sender: "ai",
                text: row.response_ai,
                timestamp: timeNow(),
              });
            }

            return items;
          });

          setMessages(normalized);
        }
      } catch (err) {
        console.error("Chat load error:", err);
      }
    };

    loadChat();
  }, [chatId]);

  /* =====================
     BACKEND CALL
  ===================== */
  const callBackend = async (text) => {
    const token = await getToken();
    if (!token) throw new Error("Auth token missing");

    const res = await fetch(`${BACKEND_URL}/vehicle/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text }),
    });

    if (!res.ok) throw new Error("Agent failed");
    return res.json();
  };

  /* =====================
     SEND MESSAGE
  ===================== */
  const sendMessage = async () => {
    if (!message.trim() || isSending) return;

    const userText = message.trim();
    setMessage("");
    setIsSending(true);

    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        sender: "user",
        text: userText,
        timestamp: timeNow(),
      },
    ]);

    try {
      const data = await callBackend(userText);

      setMessages((prev) => [
        ...prev,
        {
          id: data.chat_id ?? genId(),
          sender: "ai",
          text: formatAIResponse(data),
          timestamp: timeNow(),
        },
      ]);

      if (/workshop|garage|mechanic|service center/i.test(userText)) {
        const location = await getDeviceLocation();
        const token = await getToken();

        const workshopData = await fetchWorkshops({
          latitude: location.latitude,
          longitude: location.longitude,
          token,
        });

        const urls = workshopData?.maps_urls || [];

        if (urls.length) {
          setMessages((prev) => [
            ...prev,
            {
              id: genId(),
              sender: "ai",
              text:
                "📍 Nearby workshops:\n\n" +
                urls.map((u, i) => `${i + 1}. ${u}`).join("\n\n"),
              timestamp: timeNow(),
            },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          sender: "ai",
          text: `⚠️ ${err.message || "Something went wrong"}`,
          timestamp: timeNow(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  /* =====================
     RENDER MESSAGE
  ===================== */
  const renderMessage = ({ item }) => {
    const parts = item.text.split(/(https?:\/\/[^\s]+)/g);

    return (
      <View
        style={[
          styles.messageContainer,
          item.sender === "user" ? styles.userContainer : styles.aiContainer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            item.sender === "user" ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text
            style={item.sender === "user" ? styles.userText : styles.aiText}
          >
            {parts.map((p, i) =>
              p.startsWith("http") ? (
                <Text
                  key={i}
                  style={styles.link}
                  onPress={() => Linking.openURL(p)}
                >
                  {p}
                </Text>
              ) : (
                p
              )
            )}
          </Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  /* =====================
     UI
  ===================== */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AutoVitals</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 🔧 FIX: Unmount sidebar on web to avoid aria-hidden focus bug */}
      {sidebarVisible && (
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          user={user}
          signOut={signOut}
          router={router}
        />
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          multiline
        />
        <TouchableOpacity onPress={sendMessage} disabled={isSending}>
          <Ionicons
            name={isSending ? "hourglass-outline" : "send"}
            size={22}
            color="#27374D"
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F8"
  },
  header: {
    backgroundColor: "#27374D",
    paddingTop: Platform.OS === "android" ? 40 : 16, // Adjust for safe area
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  headerSpacer: { width: 44 },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100, // Space for input bar
  },
  messageContainer: {
    marginBottom: 20,
    width: "100%",
  },
  bubble: {
    padding: 16,
    borderRadius: 20,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: "#27374D",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(157, 178, 191, 0.2)",
  },
  userText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22
  },
  aiText: {
    color: "#27374D",
    fontSize: 16,
    lineHeight: 22
  },
  link: {
    color: "#3498db",
    textDecorationLine: "underline",
    fontWeight: "600"
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    color: "rgba(0, 0, 0, 0.4)", // Adaptive color based on bg? No, fixed for now.
    alignSelf: "flex-end",
    fontWeight: "500",
  },
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    backgroundColor: "transparent", // Let the blur/gradient show if we had one, or just transparent over bg
  },
  // To make the input bar look like a floating glass/card
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    color: "#27374D",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12, // Align multiline text
    paddingBottom: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#DDE6ED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButton: { // New style for send button container if needed, but we used TouchableOpacity direct
    // Handled inline or wrap it if needed.
  },

  // Sidebar styles
  sidebarContainer: {
    flex: 1,
    flexDirection: "row",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(39, 55, 77, 0.6)", // Darker, tinted overlay
    backdropFilter: "blur(4px)", // Works on web
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  sidebarHeader: {
    backgroundColor: "#27374D",
    padding: 24,
    paddingTop: 60,
    borderBottomRightRadius: 30,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DDE6ED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#526D82",
  },
  avatarText: {
    color: "#27374D",
    fontSize: 24,
    fontWeight: "800",
  },
  userName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  userEmail: {
    color: "#9DB2BF",
    fontSize: 13,
    fontWeight: "500",
  },
  menuItems: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#F5F7F8",
  },
  menuLabel: {
    fontSize: 16,
    color: "#27374D",
    marginLeft: 16,
    fontWeight: "600",
  },
  sidebarFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    color: "#EF4444",
    marginLeft: 16,
    fontWeight: "600",
  },
});
