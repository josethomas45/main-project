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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

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
      text: `Hi ${user?.firstName || "there"}  How can I help you today?`,
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

  const toggleSidebar = () => {
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? -SIDEBAR_WIDTH : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setSidebarVisible(!sidebarVisible);
  };

  const handleMenuPress = (option) => {
    console.log(`Selected: ${option}`);
    toggleSidebar();
    if (option === "Maintenance Reminder") {
      router.push('/maintenance-reminder');
    }
    if (option === "Schedule") {
      router.push('/schedule');
    }
    // Handle navigation or actions here
  };

  // 🔧 FIXED: matches backend AgentResponse exactly
  const formatAIResponse = (data) => {
    let text = "";

    if (data.diagnosis) {
      text += ` Diagnosis:\n${data.diagnosis}\n\n`;
    }

    if (data.explanation) {
      text += ` Explanation:\n${data.explanation}\n\n`;
    }

    if (data.action) {
      text += `⚠️ Action: ${data.action}\n`;
    }

    if (typeof data.severity === "number") {
      text += `⚠️ Severity: ${Math.round(data.severity * 100)}%\n\n`;
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
      {/* Status Bar */}
      <StatusBar barStyle="light-content" backgroundColor="#27374D" />

      {/* Header - Fixed with proper spacing */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn}>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  menuBtn: {
    padding: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  logoutBtn: {
    padding: 4,
  },

  // Sidebar Styles
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#FFFFFF",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    backgroundColor: "#27374D",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 70,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  sidebarHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sidebarTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9DB2BF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#27374D",
    fontWeight: "600",
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userInfoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userInfoAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  userInfoText: {
    flex: 1,
  },
  userInfoName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27374D",
    marginBottom: 2,
  },
  userInfoEmail: {
    fontSize: 12,
    color: "#9DB2BF",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 99,
  },

  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  aiContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "#27374D",
  },
  aiBubble: {
    backgroundColor: "#9DB2BF",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: "#27374D",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    color: "#666",
  },
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