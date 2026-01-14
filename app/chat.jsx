import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getDeviceLocation } from "../utils/location";
import { fetchWorkshops } from "../utils/workshops";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

export default function Chat() {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: `welcome-${Date.now()}`,
      text: `Hi ${user?.firstName || "there"} 👋 How can I help you today?`,
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);
  const msgCounter = useRef(0);

  function timeNow() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const msgCounter = useRef(0);

  function timeNow() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const genId = () => `msg-${Date.now()}-${++msgCounter.current}`;
  const genId = () => `msg-${Date.now()}-${++msgCounter.current}`;

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const toggleSidebar = () => {
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? -SIDEBAR_WIDTH : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setSidebarVisible(!sidebarVisible);
  };

  // 🔧 FIXED: matches backend AgentResponse exactly
  const formatAIResponse = (data) => {
    let text = "";

  if (data.diagnosis) {
    text += `🔍 Diagnosis:\n${data.diagnosis}\n\n`;
  }

  if (data.explanation) {
    text += `🧠 Explanation:\n${data.explanation}\n\n`;
  }

    if (data.action) {
      text += `⚠️ Action: ${data.action}\n`;
    }

  if (typeof data.severity === "number") {
    text += `🔥 Severity: ${Math.round(data.severity * 100)}%\n\n`;
  }

  // ✅ SHOW FOLLOW-UP QUESTIONS
  if (Array.isArray(data.follow_up_questions) && data.follow_up_questions.length > 0) {
    text += "❓ Follow-up questions:\n";
    data.follow_up_questions.forEach((q, i) => {
      text += `${i + 1}. ${q}\n`;
    });
  }

  return text.trim();
};

  const callBackend = async (userMessage) => {
    const token = await getToken();
    if (!token) throw new Error("Auth token missing");

    const res = await fetch(`${BACKEND_URL}/vehicle/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return res.json();
  };

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = async () => {
    if (!message.trim() || isSending) return;

    const userText = message.trim();
    setIsSending(true);
    setMessage("");
    setMessage("");

    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        sender: "user",
        id: genId(),
        sender: "user",
        text: userText,
        timestamp: timeNow(),
        timestamp: timeNow(),
      },
    ]);

    try {
      const data = await callBackend(userText);

      // Show agent reply
      setMessages((prev) => [
        ...prev,
        {
          id: data.chat_id || genId(),
          sender: "ai",
          text: formatAIResponse(data),
          timestamp: timeNow(),
        },
      ]);

      // Workshop trigger (action OR regex)
      if (
        data.action === "CONFIRM_WORKSHOP" ||
        /workshop|garage|mechanic|service center/i.test(userText)
      ) {
        const token = await getToken();
        const location = await getDeviceLocation();

        const workshopResponse = await fetchWorkshops({
        const workshopResponse = await fetchWorkshops({
          latitude: location.latitude,
          longitude: location.longitude,
          token,
        });

        const agentReply = formatWorkshopAgentReply(workshopResponse);

        setMessages((prev) => [...prev, agentReply]);
        return;
      }

      // 🤖 NORMAL AGENT FLOW
      const token = await getToken();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/vehicle/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: userText }),
        }
      );

      if (!res.ok) throw new Error("Agent failed");

      const data = await res.json();

        setMessages((prev) => [
          ...prev,
          formatWorkshopBubble(workshopResponse),
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
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

  // ---------- RENDER MESSAGE ----------

  const renderMessage = ({ item }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = item.text.split(urlRegex);

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
            item.sender === "user"
              ? styles.userBubble
              : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.sender === "user"
                ? styles.userText
                : styles.aiText,
            ]}
          >
            {parts.map((part, i) =>
              urlRegex.test(part) ? (
                <Text
                  key={i}
                  style={styles.link}
                  onPress={() => Linking.openURL(part)}
                >
                  {part}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  // ---------- UI ----------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Status Bar */}
      <StatusBar barStyle="light-content" backgroundColor="#27374D" />

      {/* Header - Fixed with proper spacing */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vasu The Mech</Text>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: sidebarAnimation }],
          },
        ]}
      >
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarHeaderIcon}>
            <Ionicons name="construct" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.sidebarTitle}>Vasu The Mech</Text>
        </View>

        <View style={styles.sidebarContent}>
          {/* Menu Options */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuPress("Maintenance Reminder")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="alarm-outline" size={24} color="#27374D" />
            </View>
            <Text style={styles.menuItemText}>Maintenance Reminder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuPress("Schedule")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#27374D" />
            </View>
            <Text style={styles.menuItemText}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuPress("Cost Tracking")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#27374D" />
            </View>
            <Text style={styles.menuItemText}>Cost Tracking</Text>
          </TouchableOpacity>
        </View>

        {/* Sidebar Footer */}
        <View style={styles.sidebarFooter}>
          <View style={styles.userInfo}>
            <View style={styles.userInfoAvatar}>
              <Text style={styles.userInfoAvatarText}>
                {user?.firstName?.charAt(0) || "U"}
              </Text>
            </View>
            <View style={styles.userInfoText}>
              <Text style={styles.userInfoName}>
                {user?.firstName || "User"} {user?.lastName || ""}
              </Text>
              <Text style={styles.userInfoEmail}>
                {user?.primaryEmailAddress?.emailAddress || ""}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Overlay */}
      {sidebarVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleSidebar}
        />
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          placeholderTextColor="#9DB2BF"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={isSending}
          style={styles.sendBtn}
        >
          <Ionicons
            name={isSending ? "hourglass-outline" : "send"}
            size={22}
            color={isSending ? "#9DB2BF" : "#27374D"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#27374D",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  messagesList: { padding: 16 },
  messageContainer: { marginBottom: 12 },
  bubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: "80%",
  },
  userBubble: { backgroundColor: "#27374D", alignSelf: "flex-end" },
  aiBubble: { backgroundColor: "#9DB2BF", alignSelf: "flex-start" },
  messageText: { fontSize: 15 },
  userText: { color: "#fff" },
  aiText: { color: "#27374D" },
  timestamp: { fontSize: 10, marginTop: 4, color: "#555" },
  inputBar: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
    maxHeight: 100,
    color: "#27374D",
  },
  sendBtn: {
    padding: 8,
  },
});