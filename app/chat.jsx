import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Chat() {
  const { signOut } = useAuth();
  const { user } = useUser();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "1", text: `Hi ${user?.firstName || 'there'} 👋 How can I help you today?`, sender: "ai" },
  ]);

  const sendMessage = () => {
    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: message, sender: "user" },
    ]);

    setMessage("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          text: "This is an AI response 🤖",
          sender: "ai",
        },
      ]);
    }, 800);
  };

  const handleLogout = async () => {
    await signOut();
    // _layout.jsx will automatically redirect to login
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vasu The Mech</Text>
          <Text style={styles.headerSubtitle}>{user?.primaryEmailAddress?.emailAddress}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.sender === "user" ? styles.user : styles.ai,
            ]}
          >
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Message Vasu..."
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={sendMessage}>
          <Ionicons name="send" size={22} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1419" },
  header: {
    padding: 20,
    backgroundColor: "#1a1f2e",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "#999", fontSize: 12, marginTop: 2 },
  bubble: {
    margin: 10,
    padding: 12,
    borderRadius: 14,
    maxWidth: "70%",
  },
  user: { backgroundColor: "#3b82f6", alignSelf: "flex-end" },
  ai: { backgroundColor: "#1e293b", alignSelf: "flex-start" },
  text: { color: "#fff" },
  inputBar: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  input: { flex: 1, color: "#fff", marginRight: 10 },
});