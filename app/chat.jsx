import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
  throw new Error(
    "EXPO_PUBLIC_BACKEND_URL is missing. Check your .env file."
  );
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
    text += `🔍 Diagnosis:\n${data.diagnosis}\n\n`;
  }

  if (data.explanation) {
    text += `🧠 Explanation:\n${data.explanation}\n\n`;
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
    text += "❓ Follow-up Questions:\n";
    data.follow_up_questions.forEach((q, i) => {
      text += `${i + 1}. ${q}\n`;
    });
    text += "\n";
  }

  if (typeof data.severity === "number") {
    text += `🔥 Severity: ${Math.round(data.severity * 100)}%\n`;
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
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const menuItems = [
    {
      id: "maintenance",
      icon: "build-outline",
      label: "Maintenance Tracking",
      onPress: () => {
        router.push("MaintenanceTracking");
        onClose();
      },
    },
    {
      id: "history",
      icon: "time-outline",
      label: "History",
      onPress: () => {
        console.log("Navigate to History");
        onClose();
      },
    },
    {
      id: "profile",
      icon: "person-outline",
      label: "Profile",
      onPress: () => {
        console.log("Navigate to Profile");
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
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sidebar,
            { transform: [{ translateX: slideAnim }] },
          ]}
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

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: `Hi ${user?.firstName || "there"} 👋 How can I help you today?`,
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

      // AI response
      setMessages((prev) => [
        ...prev,
        {
          id: data.chat_id ?? genId(),
          sender: "ai",
          text: formatAIResponse(data),
          timestamp: timeNow(),
        },
      ]);

      // Workshop intent
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
          item.sender === "user"
            ? styles.userContainer
            : styles.aiContainer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            item.sender === "user" ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text style={item.sender === "user" ? styles.userText : styles.aiText}>
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
        <Text style={styles.headerTitle}>Vasu The Mech</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        user={user}
        signOut={signOut}
        router={router}
      />

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
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#27374D",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  headerSpacer: { width: 36 },
  messagesList: { padding: 16 },
  messageContainer: { marginBottom: 12 },
  bubble: { padding: 14, borderRadius: 16, maxWidth: "80%" },
  userBubble: { backgroundColor: "#27374D", alignSelf: "flex-end" },
  aiBubble: { backgroundColor: "#9DB2BF", alignSelf: "flex-start" },
  userText: { color: "#fff" },
  aiText: { color: "#27374D" },
  link: { color: "#1B4DFF", textDecorationLine: "underline" },
  timestamp: { fontSize: 10, marginTop: 4, color: "#555" },
  inputBar: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: { flex: 1, fontSize: 15, marginRight: 8 },
  
  // Sidebar styles
  sidebarContainer: {
    flex: 1,
    flexDirection: "row",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sidebarHeader: {
    backgroundColor: "#27374D",
    padding: 20,
    paddingTop: 50,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#9DB2BF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#27374D",
    fontSize: 20,
    fontWeight: "700",
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    color: "#9DB2BF",
    fontSize: 12,
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingLeft: 24,
  },
  menuLabel: {
    fontSize: 16,
    color: "#27374D",
    marginLeft: 16,
    fontWeight: "500",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    padding: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 8,
  },
  logoutText: {
    fontSize: 16,
    color: "#E74C3C",
    marginLeft: 16,
    fontWeight: "500",
  },
});