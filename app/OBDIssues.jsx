import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Severity colors
const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case "high":
      return "#ef4444";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#10b981";
    default:
      return "#64748b";
  }
};

const getSeverityGradient = (severity) => {
  switch (severity?.toLowerCase()) {
    case "high":
      return ["#ef4444", "#dc2626"];
    case "medium":
      return ["#f59e0b", "#d97706"];
    case "low":
      return ["#10b981", "#059669"];
    default:
      return ["#64748b", "#475569"];
  }
};

// Format metric names
const formatMetricName = (metric) => {
  if (!metric) return "Unknown";
  return metric
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Get icon for issue type
const getIssueIcon = (metric) => {
  const m = metric?.toLowerCase() || "";
  if (m.includes("temp") || m.includes("coolant")) return "thermometer";
  if (m.includes("rpm") || m.includes("engine")) return "speedometer";
  if (m.includes("speed")) return "car";
  if (m.includes("load")) return "barbell";
  if (m.includes("pressure")) return "water";
  return "warning";
};

// Format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function OBDIssues() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  
  // Hardcoded vehicle ID for now (TODO: get from user profile)
  const VEHICLE_ID = "vehicle-001";

  useEffect(() => {
    fetchIncidents();
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);
  
  /* ============================
     WEBSOCKET CONNECTION
  ============================ */
  const connectWebSocket = async () => {
    try {
      const token = await getToken();
      
      // Determine WebSocket protocol based on backend URL
      const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss://' : 'ws://';
      const cleanUrl = BACKEND_URL.replace('http://', '').replace('https://', '');
      const wsUrl = `${wsProtocol}${cleanUrl}/ws/obd/${VEHICLE_ID}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        
        // Send authentication token
        ws.current.send(JSON.stringify({ 
          type: 'auth', 
          token 
        }));
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeData(data);
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        
        // Auto-reconnect after 5 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 5000);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setWsConnected(false);
    }
  };
  
  /* ============================
     HANDLE REALTIME DATA
  ============================ */
  const handleRealtimeData = (data) => {
    const { decoded, alerts } = data;
    
    console.log('Received realtime data:', data);
    
    // Handle new alerts
    if (alerts && alerts.length > 0) {
      for (const alert of alerts) {
        // Show alert notification
        Alert.alert(
          '⚠️ New Vehicle Issue',
          `${formatMetricName(alert.metric)}: ${alert.message}`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'View', onPress: () => fetchIncidents() },
          ]
        );
      }
      
      // Refresh incidents list
      fetchIncidents();
    }
  };

  /* ============================
     FETCH INCIDENTS
  ============================ */
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const res = await fetch(`${BACKEND_URL}/incidents/history`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch incidents');
      
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error("Fetch incidents error:", err);
      Alert.alert("Error", "Failed to load incidents");
      // Set empty array on error so empty state shows
      setIncidents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  /* ============================
     HANDLE INCIDENT PRESS
  ============================ */
  const handleIncidentPress = async (incident) => {
    try {
      const token = await getToken();
      
      const res = await fetch(`${BACKEND_URL}/incidents/${incident.id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch incident details');
      
      const data = await res.json();
      
      // Display incident details in alert for now
      // TODO: Create detail view page with full diagnostic data and chat
      Alert.alert(
        "Incident Details",
        `ID: ${data.id}\nMetric: ${formatMetricName(data.trigger_metric)}\nValue: ${data.trigger_value} / ${data.trigger_limit}\nSeverity: ${data.severity}\nStatus: ${data.status}\n\n${data.message}`,
        [
          { text: "Close", style: "cancel" },
          data.status === "open" && {
            text: "Mark Resolved",
            onPress: () => updateIncidentStatus(data.id, "resolved"),
          },
        ].filter(Boolean)
      );
    } catch (err) {
      console.error("Fetch incident error:", err);
      Alert.alert("Error", "Failed to load incident details");
    }
  };

  /* ============================
     UPDATE INCIDENT STATUS
  ============================ */
  const updateIncidentStatus = async (incidentId, newStatus) => {
    try {
      const token = await getToken();
      
      const res = await fetch(`${BACKEND_URL}/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      Alert.alert("Success", `Incident marked as ${newStatus}`);
      
      // Refresh incidents list
      fetchIncidents();
    } catch (err) {
      console.error("Update status error:", err);
      Alert.alert("Error", "Failed to update incident status");
    }
  };

  /* ============================
     RENDER INCIDENT CARD
  ============================ */
  const renderIncident = ({ item, index }) => {
    return (
      <Animated.View
        entering={FadeInUp.duration(600).delay(100 + index * 60).springify()}
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleIncidentPress(item)}
        >
          <View
            style={[
              styles.incidentCard,
              { borderLeftColor: getSeverityColor(item.severity) },
            ]}
          >
            {/* Icon with gradient */}
            <LinearGradient
              colors={getSeverityGradient(item.severity)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons
                name={getIssueIcon(item.trigger_metric)}
                size={24}
                color="#ffffff"
              />
            </LinearGradient>

            {/* Content */}
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.metricName} numberOfLines={1}>
                  {formatMetricName(item.trigger_metric)}
                </Text>
                
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(item.severity) },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {item.severity?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.message} numberOfLines={2}>
                {item.message}
              </Text>

              {/* Value display */}
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>
                  Value: <Text style={styles.valueHighlight}>{item.trigger_value}</Text>
                </Text>
                <Text style={styles.valueText}>
                  Limit: <Text style={styles.limitText}>{item.trigger_limit}</Text>
                </Text>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          item.status === "resolved" ? "#10b981" : "#ef4444",
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {item.status === "resolved" ? "Resolved" : "Open"}
                  </Text>
                </View>

                <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
              </View>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient */}
      <LinearGradient
        colors={["#1e293b", "#0f172a", "#0f172a"]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={26} color="#f1f5f9" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Vehicle Issues</Text>
          
          {/* WebSocket Status Badge */}
          <View style={[styles.wsStatusBadge, { backgroundColor: wsConnected ? '#10b981' : '#64748b' }]}>
            <View style={styles.wsStatusDot} />
            <Text style={styles.wsStatusText}>{wsConnected ? 'Live' : 'Offline'}</Text>
          </View>
        </View>

        {/* Avatar with gradient ring */}
        <TouchableOpacity onPress={() => setShowProfileModal(true)}>
          <Animated.View entering={ZoomIn.delay(300).duration(600).springify()}>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Content area */}
      <View style={styles.contentArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Animated.View entering={ZoomIn.duration(700)}>
              <ActivityIndicator size="large" color="#6366f1" />
            </Animated.View>
          </View>
        ) : (
          <FlatList
            data={incidents}
            keyExtractor={(item) => item.id}
            renderItem={renderIncident}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6366f1"
              />
            }
            ListEmptyComponent={
              <Animated.View
                entering={FadeInUp.duration(700).delay(200)}
                style={styles.emptyState}
              >
                <View style={styles.emptyIconContainer}>
                  <LinearGradient
                    colors={["#10b981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIconGradient}
                  >
                    <Ionicons name="checkmark-circle" size={64} color="#ffffff" />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>No Issues Detected</Text>
                <Text style={styles.emptySubtitle}>
                  Your vehicle is running smoothly
                </Text>
              </Animated.View>
            }
          />
        )}
      </View>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
          />

          <Animated.View
            entering={FadeInUp.duration(500).springify()}
            style={styles.profileSheet}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.profileHeader}>
              <LinearGradient
                colors={["#6366f1", "#8b5cf6"]}
                style={styles.largeAvatarRing}
              >
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>
                    {user?.firstName?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.userEmail}>
                  {user?.emailAddresses?.[0]?.emailAddress}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Container ──
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30,41,59,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 6,
  },
  
  // ── WebSocket Status ──
  wsStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  wsStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  wsStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  // ── Content Area ──
  contentArea: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },

  // ── Incident Card ──
  cardWrapper: {
    marginBottom: 16,
  },
  incidentCard: {
    backgroundColor: "rgba(30,41,59,0.7)",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  metricName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
    flex: 1,
    marginRight: 8,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  message: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 8,
    lineHeight: 18,
  },
  valueRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  valueText: {
    fontSize: 12,
    color: "#64748b",
  },
  valueHighlight: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ef4444",
  },
  limitText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f59e0b",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  timestamp: {
    fontSize: 11,
    color: "#64748b",
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#94a3b8",
  },

  // ── Profile Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  profileSheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#475569",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 28,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  largeAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    marginRight: 16,
  },
  largeAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 33,
    backgroundColor: "#27374D",
    alignItems: "center",
    justifyContent: "center",
  },
  largeAvatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#94a3b8",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
});
