import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

// Environment configuration - replace with your actual backend URL
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
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(-SIDEBAR_WIDTH));
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const messageIdCounter = useRef(0);

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  }, []);

  useEffect(() => {
    const onShow = () => {
      setKeyboardVisible(true);
      // Increased delay for more reliable scrolling
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    };
    const onHide = () => setKeyboardVisible(false);

    const showSub = Keyboard.addListener("keyboardDidShow", onShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // Scroll to end when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const toggleSidebar = useCallback(() => {
    const toValue = sidebarVisible ? -SIDEBAR_WIDTH : 0;
    
    Animated.timing(sidebarAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setSidebarVisible(!sidebarVisible);
  }, [sidebarVisible, sidebarAnimation]);

  // Format AI response with better structure
  const formatAIResponse = useCallback((data) => {
    if (!data) return "Unable to process response.";
    
    // If the backend returns a formatted response
    if (data.response) {
      return data.response;
    }
    
    // If the backend returns structured diagnosis data
    if (data.diagnosis) {
      let formatted = "";
      
      if (data.diagnosis.issue) {
        formatted += `🔍 Issue: ${data.diagnosis.issue}\n\n`;
      }
      
      if (data.diagnosis.cause) {
        formatted += `⚙️ Possible Cause: ${data.diagnosis.cause}\n\n`;
      }
      
      if (data.diagnosis.solution) {
        formatted += `✅ Solution: ${data.diagnosis.solution}\n\n`;
      }
      
      if (data.diagnosis.severity) {
        formatted += `⚠️ Severity: ${data.diagnosis.severity}`;
      }
      
      return formatted || "Diagnosis completed.";
    }
    
    // Fallback to any text content
    if (data.message || data.text) {
      return data.message || data.text;
    }
    
    return "Response received successfully.";
  }, []);

  const callBackend = async (userMessage) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token not available");
      }

      const response = await fetch(`${BACKEND_URL}/vehicle/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.");
        } else if (response.status === 500) {
          throw new Error("Server error. Please try again later.");
        } else {
          throw new Error(`Request failed with status ${response.status}`);
        }
      }

      return await response.json();
    } catch (error) {
      console.error("Backend error:", error);
      throw error; // Re-throw to handle in sendMessage
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isSending) return;

    const userText = message.trim();
    setIsSending(true);

    const userMessage = {
      id: generateMessageId(),
      text: userText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    try {
      const data = await callBackend(userText);

      if (!data) {
        throw new Error("No response from server");
      }

      const aiMessage = {
        id: data.chat_id || generateMessageId(),
        sender: "ai",
        timestamp: data.timestamp || new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: formatAIResponse(data),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Send message error:", error);
      
      const errorMessage = {
        id: generateMessageId(),
        sender: "ai",
        text: `⚠️ ${error.message || "Unable to diagnose the issue. Please try again."}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleMenuPress = useCallback((option) => {
    console.log(`Selected: ${option}`);
    toggleSidebar();
    
    if (option === "Maintenance Reminder") {
      router.push("/maintenance-reminder");
    } else {
      Alert.alert("Coming Soon", `${option} feature will be available soon!`);
    }
  }, [toggleSidebar, router]);

  // Handle photo selection
  const handlePhotoSelect = async () => {
    setShowAttachmentModal(false);
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access photos is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Implement image upload to backend
        console.log("Selected image:", result.assets[0].uri);
        Alert.alert("Success", "Image selected. Upload functionality coming soon!");
      }
    } catch (error) {
      console.error("Photo selection error:", error);
      Alert.alert("Error", "Failed to select photo");
    }
  };

  // Handle document selection
  const handleDocumentSelect = async () => {
    setShowAttachmentModal(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        // TODO: Implement document upload to backend
        console.log("Selected document:", result.assets[0].uri);
        Alert.alert("Success", "Document selected. Upload functionality coming soon!");
      }
    } catch (error) {
      console.error("Document selection error:", error);
      Alert.alert("Error", "Failed to select document");
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === "user" ? styles.userContainer : styles.aiContainer,
      ]}
    >
      {item.sender === "ai" && (
        <View style={styles.aiAvatar}>
          <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
        </View>
      )}
      
      <View
        style={[
          styles.bubble,
          item.sender === "user" ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={[
          styles.messageText,
          item.sender === "user" ? styles.userText : styles.aiText,
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          item.sender === "user" ? styles.userTimestamp : styles.aiTimestamp,
        ]}>
          {item.timestamp}
        </Text>
      </View>

      {item.sender === "user" && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn}>
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Vasu The Mech</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
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
            onPress={() => handleMenuPress("Chat Summary")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#27374D" />
            </View>
            <Text style={styles.menuItemText}>Chat Summary</Text>
          </TouchableOpacity>
        </View>

        {/* Sidebar Footer */}
        <View style={styles.sidebarFooter}>
          <View style={styles.userInfo}>
            <View style={styles.userInfoAvatar}>
              <Text style={styles.userInfoAvatarText}>
                {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.userInfoText}>
              <Text style={styles.userInfoName}>
                {user?.firstName || "User"} {user?.lastName || ""}
              </Text>
              <Text style={styles.userInfoEmail} numberOfLines={1}>
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
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity
            onPress={() => setShowAttachmentModal(true)}
            style={styles.plusBtn}
            disabled={isSending}
          >
            <Ionicons name="add" size={24} color={isSending ? "#9DB2BF" : "#27374D"} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor="#9DB2BF"
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[
              styles.sendBtn,
              (!message.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            disabled={!message.trim() || isSending}
          >
            <Ionicons
              name={isSending ? "hourglass-outline" : "send"}
              size={20}
              color={(message.trim() && !isSending) ? "#FFFFFF" : "#9DB2BF"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Attachment Modal */}
      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachmentModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handlePhotoSelect}
            >
              <Ionicons name="camera" size={24} color="#27374D" />
              <Text style={styles.attachmentText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleDocumentSelect}
            >
              <Ionicons name="document" size={24} color="#27374D" />
              <Text style={styles.attachmentText}>Document</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#27374D",
    paddingTop: 50,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#9DB2BF",
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
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
    paddingTop: 60,
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
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  aiContainer: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  userAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "70%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#27374D",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#9DB2BF",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#27374D",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: "#9DB2BF",
    textAlign: "right",
  },
  aiTimestamp: {
    color: "#526D82",
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#9DB2BF",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#9DB2BF",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#27374D",
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#FFFFFF",
  },
  plusBtn: {
    marginRight: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  attachmentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  attachmentText: {
    fontSize: 16,
    color: "#27374D",
    marginLeft: 12,
  },
});