import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Chat() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "1", text: "Hi 👋 How can I help you today?", sender: "ai" },
  ]);

  // ✅ Protect chat route
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      }
    });
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: message, sender: "user" },
    ]);

    setMessage("");

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vasu The Mech</Text>
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
  header: { padding: 20, backgroundColor: "#1a1f2e" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
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
  },
  input: { flex: 1, color: "#fff", marginRight: 10 },
});
