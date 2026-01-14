import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://finalproject-production-fcdc.up.railway.app";

export default function Chat() {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

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

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(-SIDEBAR_WIDTH));
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef(null);
  const messageIdCounter = useRef(0);

  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // ---------- FORMATTERS ----------

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
      text += `🔥 Severity: ${Math.round(data.severity * 100)}%\n`;
    }

    return text.trim();
  };

  const formatWorkshopResults = (workshops) => {
    if (!workshops || workshops.length === 0) {
      return "❌ No nearby workshops found.";
    }

    let text = "🛠️ Nearby Workshops:\n\n";

    workshops.forEach((w, i) => {
      text += `${i + 1}. ${w.name}\n`;
      if (w.google_maps_url) {
        text += `📍 ${w.google_maps_url}\n`;
      }
      text += "\n";
    });

    return text.trim();
  };

  // ---------- API ----------

  const callBackend = async (userMessage) => {
    const token = await getToken();
    if (!token) throw new Error("Authentication token missing");

    const res = await fetch(`${BACKEND_URL}/vehicle/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!res.ok) {
      throw new Error(`Server error (${res.status})`);
    }

    return res.json();
  };

  // ---------- SEND MESSAGE ----------

  const sendMessage = async () => {
    if (!message.trim() || isSending) return;

    const userText = message.trim();
    setIsSending(true);

    setMessages((prev) => [
      ...prev,
      {
        id: generateMessageId(),
        text: userText,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setMessage("");

    try {
      const data = await callBackend(userText);

      // Show agent response
      setMessages((prev) => [
        ...prev,
        {
          id: data.chat_id || generateMessageId(),
          sender: "ai",
          text: formatAIResponse(data),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      // 🔥 WORKSHOP TRIGGER
      if (
        data.action === "CONFIRM_WORKSHOP" ||
        /workshop|garage|mechanic/i.test(userText)
      ) {
        const token = await getToken();
        const location = await getDeviceLocation();

        const workshops = await fetchWorkshops({
          latitude: location.latitude,
          longitude: location.longitude,
          token,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            sender: "ai",
            text: formatWorkshopResults(workshops),
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          sender: "ai",
          text: `⚠️ ${err.message || "Something went wrong"}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // ---------- RENDER ----------

  const renderMessage = ({ item }) => (
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
          style={[
            styles.messageText,
            item.sender === "user" ? styles.userText : styles.aiText,
          ]}
          selectable
          onPress={() => {
            const match = item.text.match(/https?:\/\/[^\s]+/);
            if (match) Linking.openURL(match[0]);
          }}
        >
          {item.text}
        </Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
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

// ---------- STYLES ----------

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
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: { flex: 1, fontSize: 15, marginRight: 8 },
});
