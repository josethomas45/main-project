import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

  const [isSending, setIsSending] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const flatListRef = useRef(null);
  const msgCounter = useRef(0);
  const sidebarAnimation = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  function timeNow() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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

  const handleMenuPress = (menuItem) => {
    console.log("Menu pressed:", menuItem);
    toggleSidebar();
    
    // Navigate to respective screens
    switch (menuItem) {
      case "Maintenance Reminder":
        router.push("/maintenance-reminder");
        break;
      case "Schedule":
        router.push("/schedule");
        break;
      case "Cost Tracking":
        router.push("/cost-tracking");
        break;
      default:
        console.log("Unknown menu item:", menuItem);
    }
  };

  // Format AI response
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

    // Show follow-up questions
    if (Array.isArray(data.follow_up_questions) && data.follow_up_questions.length > 0) {
      text += "❓ Follow-up questions:\n";
      data.follow_up_questions.forEach((q, i) => {
        text += `${i + 1}. ${q}\n`;
      });
    }

    return text.trim();
  };

  // Format workshop response
  const formatWorkshopAgentReply = (workshopData) => {
    if (!workshopData || !workshopData.workshops || workshopData.workshops.length === 0) {
      return {
        id: genId(),
        sender: "ai",
        text: "⚠️ No workshops found nearby. Please try a different location.",
        timestamp: timeNow(),
      };
    }

    let text = "🔧 Here are nearby workshops:\n\n";
    workshopData.workshops.forEach((workshop, i) => {
      text += `${i + 1}. ${workshop.name}\n`;
      text += `   📍 ${workshop.address || "Address not available"}\n`;
      text += `   📞 ${workshop.phone || "N/A"}\n`;
      if (workshop.rating) {
        text += `   ⭐ ${workshop.rating}/5\n`;
      }
      text += `\n`;
    });

    return {
      id: genId(),
      sender: "ai",
      text: text.trim(),
      timestamp: timeNow(),
    };
  };

  // Alternative format for workshop bubble
  const formatWorkshopBubble = (workshopData) => {
    return formatWorkshopAgentReply(workshopData);
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

  // Send message function
  const sendMessage = async () => {
    if (!message.trim() || isSending) return;

    const userText = message.trim();
    setIsSending(true);
    setMessage("");

    // Add user message to chat
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
      // Call backend for AI response
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
          latitude: location.latitude,
          longitude: location.longitude,
          token,
        });

        const workshopMessage = formatWorkshopAgentReply(workshopResponse);
        setMessages((prev) => [...prev, workshopMessage]);
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

  // Render message bubble
  const renderMessage = useCallback(({ item }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = item.text.split(urlRegex);

    return (
      <View
        style={[
          messageStyles.messageContainer,
          item.sender === "user"
            ? messageStyles.userContainer
            : messageStyles.aiContainer,
        ]}
      >
        <View
          style={[
            messageStyles.bubble,
            item.sender === "user"
              ? messageStyles.userBubble
              : messageStyles.aiBubble,
          ]}
        >
          <Text
            style={[
              messageStyles.messageText,
              item.sender === "user"
                ? messageStyles.userText
                : messageStyles.aiText,
            ]}
          >
            {parts.map((part, i) =>
              urlRegex.test(part) ? (
                <Text
                  key={i}
                  style={messageStyles.link}
                  onPress={() => Linking.openURL(part)}
                >
                  {part}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
          <Text style={messageStyles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  }, []);

  // Main UI
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Status Bar */}
      <StatusBar barStyle="light-content" backgroundColor="#27374D" />

      {/* Header */}
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

// Styles - Define before component uses them
const messageStyles = {
  messageContainer: { 
    marginBottom: 12 
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
    color: "#fff" 
  },
  aiText: { 
    color: "#27374D" 
  },
  timestamp: { 
    fontSize: 10, 
    marginTop: 4, 
    color: "#666",
    opacity: 0.7,
  },
  link: {
    color: "#1E90FF",
    textDecorationLine: "underline",
  },
};

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
  headerTitle: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "700" 
  },
  logoutBtn: {
    padding: 4,
  },
  messagesList: { 
    padding: 16,
    paddingBottom: 8,
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
    paddingVertical: 8,
  },
  sendBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#fff",
    zIndex: 1000,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  sidebarHeader: {
    backgroundColor: "#27374D",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  sidebarHeaderIcon: {
    marginRight: 12,
  },
  sidebarTitle: {
    color: "#fff",
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
    borderBottomColor: "#f0f0f0",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#27374D",
    fontWeight: "500",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    padding: 20,
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfoAvatarText: {
    color: "#fff",
    fontSize: 20,
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
    fontSize: 13,
    color: "#666",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },
});