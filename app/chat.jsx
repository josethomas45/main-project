import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
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
      sender: "ai",
      sender: "ai",
      text: `Hi ${user?.firstName || "there"} 👋 How can I help you today?`,
      timestamp: timeNow(),
      timestamp: timeNow(),
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

  // ---------- AGENT RESPONSE FORMAT ----------

  const formatAIResponse = (data) => {
    let text = "";

    if (data.diagnosis) {
      text += `🔍 Diagnosis:\n${data.diagnosis}\n\n`;
    }

    if (data.explanation) {
      text += `🧠 Explanation:\n${data.explanation}\n\n`;
    }

    if (Array.isArray(data.steps) && data.steps.length > 0) {
      text += "🛠️ Suggested Steps:\n";
      data.steps.forEach((step, i) => {
        text += `${i + 1}. ${step}\n`;
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

    if (data.action) {
      text += `⚠️ Action: ${data.action}\n`;
    }

    if (typeof data.severity === "number") {
      text += `🔥 Severity: ${Math.round(data.severity * 100)}%\n`;
    }

    return text.trim();
  };

  // ---------- WORKSHOP BUBBLE ----------

  const formatWorkshopBubble = (response) => {
    const urls = Array.isArray(response?.maps_urls)
      ? response.maps_urls
      : [];

    if (!urls.length) {
      return {
        id: genId(),
        sender: "ai",
        text: "❌ No nearby workshops found.",
        timestamp: timeNow(),
      };
    }

    let text = "📍 Here are some nearby workshops I found for you:\n\n";

    urls.forEach((url, i) => {
      text += `${i + 1}. ${url}\n\n`;
    });

    return {
      id: genId(),
      sender: "ai",
      text: text.trim(),
      timestamp: timeNow(),
    };
  };

  // ---------- BACKEND CALL ----------

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vasu The Mech</Text>
        <TouchableOpacity onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
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

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "#27374D",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  messagesList: { padding: 16 },
  messageContainer: { marginBottom: 12 },
  bubble: { padding: 14, borderRadius: 16, maxWidth: "80%" },
  bubble: { padding: 14, borderRadius: 16, maxWidth: "80%" },
  userBubble: { backgroundColor: "#27374D", alignSelf: "flex-end" },
  aiBubble: { backgroundColor: "#9DB2BF", alignSelf: "flex-start" },
  messageText: { fontSize: 15 },
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
});
