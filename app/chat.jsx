import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence
} from "react-native-reanimated";
import * as Speech from "expo-speech";
import Voice from "@react-native-voice/voice";
import * as Haptics from "expo-haptics";

import { getDeviceLocation } from "../utils/location";
import { fetchWorkshops } from "../utils/workshops";
import VehicleCheckModal from "../components/VehicleCheckModal";
import { useVehicle } from "../contexts/VehicleContext";

/* =====================
   ENV GUARD
===================== */
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("EXPO_PUBLIC_BACKEND_URL is missing. Check your .env file.");
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;

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
    text += `💡 Explanation:\n${data.explanation}\n\n`;
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
    text += `⚠️ Severity: ${Math.round(data.severity * 100)}%\n`;
  }

  return text.trim() || "⚠️ No response from agent";
}

/* =====================
   SIDEBAR COMPONENT (GLASS)
===================== */
function Sidebar({ visible, onClose, user, signOut, router, clearVehicle }) {
  const slideAnim = useRef(new RNAnimated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    RNAnimated.timing(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 350,
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
      id: "obd-issues",
      icon: "warning-outline",
      label: "Vehicle Issues",
      onPress: () => {
        router.push("OBDIssues");
        onClose();
      },
    },
    {
      id: "history",
      icon: "time-outline",
      label: "History",
      onPress: () => {
        router.push("HistoryPage");
        onClose();
      },
    },
    {
      id: "profile",
      icon: "person-outline",
      label: "Profile",
      onPress: () => {
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
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Glass Sidebar */}
        <RNAnimated.View
          style={[
            styles.sidebar,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Header with gradient avatar */}
          <View style={styles.sidebarHeader}>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sidebarAvatarRing}
            >
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>
                  {user?.firstName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            </LinearGradient>

            <Text style={styles.sidebarUserName}>
              {user?.firstName || "User"} {user?.lastName || ""}
            </Text>
            <Text style={styles.sidebarUserEmail}>
              {user?.primaryEmailAddress?.emailAddress || ""}
            </Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon} size={22} color="#a5b4fc" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <View style={styles.sidebarFooter}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                clearVehicle?.();
                signOut();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

/* =====================
   MAIN COMPONENT
===================== */
export default function Chat() {
  const { signOut, getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { chatId } = useLocalSearchParams();
  const { currentVehicle, isCheckingVehicle, clearVehicle } = useVehicle();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: `Hi ${user?.firstName || "there"} — how can I help with your vehicle today?`,
      timestamp: timeNow(),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  
  // Voice features state
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  const flatListRef = useRef(null);
  const msgCounter = useRef(0);
  const genId = () => `msg-${Date.now()}-${++msgCounter.current}`;

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  /* =====================
     VEHICLE CHECK FLOW
  ===================== */
  useEffect(() => {
    // Show vehicle modal if user is signed in but has no vehicle
    if (isSignedIn && !isCheckingVehicle && !currentVehicle) {
      setShowVehicleModal(true);
    } else {
      setShowVehicleModal(false);
    }
  }, [isSignedIn, currentVehicle, isCheckingVehicle]);

  /* =====================
     LOAD EXISTING CHAT
  ===================== */
  useEffect(() => {
    if (!chatId) return;

    const loadChat = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(`${BACKEND_URL}/chat/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;
        const data = await res.json();

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
     VOICE FEATURES
  ===================== */
  // Check if Voice is available and initialize
  useEffect(() => {
    const initVoice = async () => {
      try {
        // Check if Voice module is properly initialized
        const available = await Voice.isAvailable();
        setVoiceAvailable(available);
        
        if (available) {
          Voice.onSpeechStart = () => {
            setIsRecording(true);
          };
          
          Voice.onSpeechEnd = () => {
            setIsRecording(false);
          };
          
          Voice.onSpeechResults = (e) => {
            if (e.value && e.value[0]) {
              setMessage(e.value[0]);
            }
          };
          
          Voice.onSpeechError = (e) => {
            console.error('Speech error:', e);
            setIsRecording(false);
            Alert.alert(
              'Speech Recognition Error',
              'Could not recognize speech. Please try again with less background noise.'
            );
          };
        }
      } catch (error) {
        console.log('Voice not available:', error);
        setVoiceAvailable(false);
      }
    };

    initVoice();

    return () => {
      if (voiceAvailable) {
        Voice.destroy().then(Voice.removeAllListeners).catch(e => console.log(e));
      }
    };
  }, []);

  // Start voice recording
  const startVoiceRecording = async () => {
    // Check if running in Expo Go (voice not available)
    if (!voiceAvailable) {
      Alert.alert(
        'Voice Input Not Available',
        'Voice recording requires a custom development build. This feature is not available in Expo Go.\n\nAlternatively, you can:\n• Type your message manually\n• Use the web version with browser speech recognition\n• Build a custom development build with: npx expo prebuild',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Learn More', 
            onPress: () => console.log('See docs: https://docs.expo.dev/workflow/prebuild/')
          }
        ]
      );
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Voice.start('en-US');
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert(
        'Recording Error',
        'Failed to start voice recording. Please check microphone permissions and try again.'
      );
      setIsRecording(false);
    }
  };

  // Stop voice recording
  const stopVoiceRecording = async () => {
    if (!voiceAvailable) {
      setIsRecording(false);
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Voice.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  // Toggle voice recording
  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Speak message (Text-to-Speech)
  const speakMessage = async (text, messageId) => {
    try {
      // Stop any currently playing speech
      if (speakingMessageId) {
        await Speech.stop();
      }

      // If clicking on the same message, just stop
      if (speakingMessageId === messageId) {
        setSpeakingMessageId(null);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Clean text for better speech (remove emojis and special formatting)
      const cleanText = text.replace(/[🔍💡🛠️❓⚠️📍]/g, '').trim();
      
      setSpeakingMessageId(messageId);
      
      Speech.speak(cleanText, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setSpeakingMessageId(null),
        onStopped: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    } catch (error) {
      console.error('TTS error:', error);
      setSpeakingMessageId(null);
    }
  };

  // Press animation for send button
  const scale = useSharedValue(1);
  const animatedSendButton = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSendPress = () => {
    scale.value = withSpring(0.9, { damping: 10 });
    setTimeout(() => {
      scale.value = withSpring(1);
    }, 100);
    sendMessage();
  };

  // Microphone animation
  const micScale = useSharedValue(1);
  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  useEffect(() => {
    if (isRecording) {
      micScale.value = withRepeat(
        withSequence(
          withSpring(1.2, { damping: 2 }),
          withSpring(1, { damping: 2 })
        ),
        -1,
        true
      );
    } else {
      micScale.value = withSpring(1);
    }
  }, [isRecording]);

  /* =====================
     RENDER MESSAGE
  ===================== */
  const renderMessage = ({ item, index }) => {
    const parts = item.text.split(/(https?:\/\/[^\s]+)/g);

    return (
      <Animated.View
        entering={
          item.sender === "user"
            ? FadeInRight.duration(500).delay(50)
            : FadeInLeft.duration(500).delay(50)
        }
        style={[
          styles.messageContainer,
          item.sender === "user" ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        {item.sender === "user" ? (
          // User message - gradient bubble
          <LinearGradient
            colors={["#6366f1", "#8b5cf6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userBubble}
          >
            <Text style={styles.userText}>
              {parts.map((p, i) =>
                p.startsWith("http") ? (
                  <Text
                    key={i}
                    style={styles.linkUser}
                    onPress={() => Linking.openURL(p)}
                  >
                    {p}
                  </Text>
                ) : (
                  p
                )
              )}
            </Text>
            <Text style={styles.timestampUser}>{item.timestamp}</Text>
          </LinearGradient>
        ) : (
          // AI message - glass bubble
          <View style={styles.aiBubble}>
            {/* Speaker button for TTS */}
            <TouchableOpacity
              style={styles.speakerButton}
              onPress={() => speakMessage(item.text, item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={speakingMessageId === item.id ? "volume-high" : "volume-medium-outline"}
                size={18}
                color={speakingMessageId === item.id ? "#6366f1" : "#94a3b8"}
              />
            </TouchableOpacity>
            
            <Text style={styles.aiText}>
              {parts.map((p, i) =>
                p.startsWith("http") ? (
                  <Text
                    key={i}
                    style={styles.linkAi}
                    onPress={() => Linking.openURL(p)}
                  >
                    {p}
                  </Text>
                ) : (
                  p
                )
              )}
            </Text>
            <Text style={styles.timestampAi}>{item.timestamp}</Text>
            
            {/* Speaking indicator */}
            {speakingMessageId === item.id && (
              <View style={styles.speakingIndicator}>
                <Text style={styles.speakingText}>🔊 Playing...</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  /* =====================
     UI
  ===================== */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={["#1e293b", "#0f172a"]}
        style={styles.backgroundGradient}
      />

      {/* Glass Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={26} color="#f1f5f9" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>AutoVitals</Text>

        <TouchableOpacity onPress={() => { clearVehicle(); signOut(); }} style={styles.logoutHeaderButton}>
          <Ionicons name="log-out-outline" size={24} color="#f1f5f9" />
        </TouchableOpacity>
      </Animated.View>

      {/* Sidebar */}
      {sidebarVisible && (
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          user={user}
          signOut={signOut}
          router={router}
          clearVehicle={clearVehicle}
        />
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Input Bar (Glass Composer) */}
      <Animated.View entering={FadeInUp.delay(400).duration(700)} style={styles.inputBarContainer}>
        {/* Recording indicator */}
        {isRecording && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening...</Text>
          </Animated.View>
        )}
        
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Message AutoVitals..."
            placeholderTextColor="#64748b"
            multiline
            maxLength={500}
          />

          {/* Microphone button */}
          <Animated.View style={micAnimatedStyle}>
            <TouchableOpacity
              onPress={toggleVoiceRecording}
              activeOpacity={0.7}
              style={{ marginRight: 8 }}
            >
              <LinearGradient
                colors={
                  isRecording
                    ? ["#ef4444", "#dc2626"]
                    : ["#6366f1", "#8b5cf6"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micButton}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={20}
                  color="#ffffff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={animatedSendButton}>
            <TouchableOpacity
              onPress={handleSendPress}
              disabled={isSending || !message.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isSending || !message.trim()
                    ? ["#475569", "#475569"]
                    : ["#6366f1", "#8b5cf6"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButton}
              >
                <Ionicons
                  name={isSending ? "hourglass-outline" : "send"}
                  size={20}
                  color="#ffffff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Vehicle Check Modal */}
      <VehicleCheckModal 
        visible={showVehicleModal}
        onComplete={() => setShowVehicleModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ── Header (Glass) ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(30,41,59,0.5)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
    zIndex: 10,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: 0.5,
  },
  logoutHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Messages List ──
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  messageContainer: {
    marginBottom: 16,
    width: "100%",
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },

  // ── User Bubble (Gradient) ──
  userBubble: {
    maxWidth: "85%",
    padding: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  userText: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 22,
  },
  timestampUser: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
    alignSelf: "flex-end",
    fontWeight: "500",
  },
  linkUser: {
    color: "#e0e7ff",
    textDecorationLine: "underline",
    fontWeight: "600",
  },

  // ── AI Bubble (Glass) ──
  aiBubble: {
    maxWidth: "85%",
    backgroundColor: "rgba(30,41,59,0.7)",
    padding: 16,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  aiText: {
    color: "#f1f5f9",
    fontSize: 16,
    lineHeight: 22,
  },
  timestampAi: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 6,
    alignSelf: "flex-end",
    fontWeight: "500",
  },
  linkAi: {
    color: "#a5b4fc",
    textDecorationLine: "underline",
    fontWeight: "600",
  },

  // ── Input Bar (Floating Glass Composer) ──
  inputBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    paddingTop: 12,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(30,41,59,0.9)",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#f1f5f9",
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Sidebar (Glass Panel) ──
  sidebarContainer: {
    flex: 1,
    flexDirection: "row",
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "rgba(30,41,59,0.95)",
    borderRightWidth: 1,
    borderRightColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  // ── Sidebar Header ──
  sidebarHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
  },
  sidebarAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    marginBottom: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  sidebarAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarAvatarText: {
    color: "#f1f5f9",
    fontSize: 36,
    fontWeight: "800",
  },
  sidebarUserName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  sidebarUserEmail: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // ── Menu Items ──
  menuItems: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "rgba(51,65,85,0.5)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: "#f1f5f9",
    fontWeight: "600",
  },

  // ── Sidebar Footer ──
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.1)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  logoutText: {
    fontSize: 16,
    color: "#ef4444",
    marginLeft: 12,
    fontWeight: "600",
  },

  // ── Voice Features ──
  // Microphone button
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Recording indicator
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 8,
  },
  recordingText: {
    color: "#fecaca",
    fontSize: 14,
    fontWeight: "600",
  },

  // Speaker button (on AI bubble)
  speakerButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },

  // Speaking indicator
  speakingIndicator: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "rgba(99,102,241,0.15)",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  speakingText: {
    color: "#a5b4fc",
    fontSize: 12,
    fontWeight: "600",
  },
});