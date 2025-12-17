import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "1", text: "Hi 👋 How can I help you today?", sender: "ai" },
  ]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      text: message,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");

    // Dummy AI reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), text: "This is an AI response 🤖", sender: "ai" },
      ]);
    }, 800);
  };

  const renderItem = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === "user" ? styles.userMessageContainer : styles.aiMessageContainer
    ]}>
      {item.sender === "ai" && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
      )}
      
      <View
        style={[
          styles.messageBubble,
          item.sender === "user" ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={[
          styles.messageText,
          item.sender === "user" && styles.userText
        ]}>
          {item.text}
        </Text>
      </View>
      
      {item.sender === "user" && (
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={16} color="#fff" />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.aiIconLarge}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Vasu The Mech</Text>
            <Text style={styles.headerSubtitle}>AI Assistant</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chat messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatArea}
        showsVerticalScrollIndicator={false}
      />

      {/* Input area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle" size={24} color="#6b7280" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Message Vasu..."
            placeholderTextColor="#9ca3af"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity 
            onPress={sendMessage}
            style={[styles.sendButton, message.trim() && styles.sendButtonActive]}
          >
            <Ionicons 
              name="send" 
              size={18} 
              color={message.trim() ? "#fff" : "#9ca3af"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1419",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#1a1f2e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2f3e",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  chatArea: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "70%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: "#e5e7eb",
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1a1f2e",
    borderTopWidth: 1,
    borderTopColor: "#2a2f3e",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1419",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#2a2f3e",
  },
  attachButton: {
    padding: 4,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "#3b82f6",
  },
});