import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Home() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();

  const logout = async () => {
    await signOut();
  };

  const goToChat = () => {
    router.push("/chat");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="home" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.headerTitle}>Welcome Home!</Text>
        <Text style={styles.headerSubtitle}>
          {user?.primaryEmailAddress?.emailAddress || "Guest"}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingCard}>
          <Text style={styles.greetingTitle}>
            Hello, {user?.firstName || "there"}! 👋
          </Text>
          <Text style={styles.greetingText}>
            Ready to start chatting with Vasu The Mech?
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={goToChat}>
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubbles" size={28} color="#27374D" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Chatting</Text>
              <Text style={styles.actionSubtitle}>
                Continue your conversation with AI
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9DB2BF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="time" size={28} color="#27374D" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Chat History</Text>
              <Text style={styles.actionSubtitle}>
                View your previous conversations
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9DB2BF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="settings" size={28} color="#27374D" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>
                Customize your experience
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9DB2BF" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#526D82" />
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#526D82" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.primaryEmailAddress?.emailAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#27374D",
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9DB2BF",
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  greetingCard: {
    backgroundColor: "#27374D",
    padding: 24,
    borderRadius: 20,
    marginBottom: 30,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  greetingText: {
    fontSize: 15,
    color: "#9DB2BF",
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#9DB2BF",
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#9DB2BF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27374D",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#526D82",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#9DB2BF",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#526D82",
    marginLeft: 12,
    width: 60,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#27374D",
  },
  divider: {
    height: 1,
    backgroundColor: "#9DB2BF",
    marginVertical: 16,
  },
  logoutBtn: {
    backgroundColor: "#27374D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  spacer: {
    height: 30,
  },
});