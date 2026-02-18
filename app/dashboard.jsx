import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
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
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useVehicle } from "../contexts/VehicleContext";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Format a date/string into a relative time label
function formatRelativeTime(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
    const { user } = useUser();
    const { signOut, getToken } = useAuth();
    const router = useRouter();
    const { currentVehicle } = useVehicle();

    // Derive display name from real vehicle data
    const vehicleDisplayName = currentVehicle?.model
        ? currentVehicle.model
        : currentVehicle?.vin
        ? `VIN: ${currentVehicle.vin}`
        : "No Vehicle";

    const [showMenu, setShowMenu] = useState(false);
    const [recentActivity, setRecentActivity] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);

    useEffect(() => {
        const loadActivity = async () => {
            try {
                const token = await getToken();
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch all 3 sources in parallel, fail gracefully
                const [chatsRes, incidentsRes, maintenanceRes] = await Promise.allSettled([
                    fetch(`${BACKEND_URL}/chat/history`, { headers }),
                    fetch(`${BACKEND_URL}/incidents/history`, { headers }),
                    fetch(`${BACKEND_URL}/maintenance/`, { headers }),
                ]);

                const items = [];

                if (chatsRes.status === "fulfilled" && chatsRes.value.ok) {
                    const chats = await chatsRes.value.json();
                    chats.forEach((c) => items.push({
                        id: `chat-${c.id}`,
                        type: "chat",
                        title: c.title || "Chat conversation",
                        date: c.created_at,
                        icon: "chatbubble-outline",
                        color: "#6366f1",
                        bgColor: "rgba(99,102,241,0.15)",
                        onPress: () => router.push({ pathname: "/HistoryPage", params: { chatId: c.id } }),
                    }));
                }

                if (incidentsRes.status === "fulfilled" && incidentsRes.value.ok) {
                    const incidents = await incidentsRes.value.json();
                    incidents.forEach((inc) => items.push({
                        id: `inc-${inc.id}`,
                        type: "incident",
                        title: inc.trigger_metric
                            ? inc.trigger_metric.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                            : "Vehicle issue detected",
                        date: inc.created_at,
                        icon: "warning-outline",
                        color: "#ef4444",
                        bgColor: "rgba(239,68,68,0.15)",
                        onPress: () => router.push("/OBDIssues"),
                    }));
                }

                if (maintenanceRes.status === "fulfilled" && maintenanceRes.value.ok) {
                    const maintenance = await maintenanceRes.value.json();
                    maintenance.forEach((m) => items.push({
                        id: `maint-${m.id}`,
                        type: "maintenance",
                        title: m.service_type
                            ? m.service_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                            : "Maintenance record",
                        date: m.service_date || m.created_at,
                        icon: "build-outline",
                        color: "#8b5cf6",
                        bgColor: "rgba(139,92,246,0.15)",
                        onPress: () => router.push("/MaintenanceTracking"),
                    }));
                }

                // Sort newest first, keep top 3
                items.sort((a, b) => new Date(b.date) - new Date(a.date));
                setRecentActivity(items.slice(0, 3));
            } catch (err) {
                console.error("Failed to load recent activity:", err);
            } finally {
                setActivityLoading(false);
            }
        };

        loadActivity();
    }, []);

    // Press animation helper
    const createPressAnimation = () => {
        const scale = useSharedValue(1);
        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
        }));

        const onPressIn = () => {
            scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        };
        const onPressOut = () => {
            scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        };

        return { animatedStyle, onPressIn, onPressOut };
    };

    // Quick actions data
    const quickActions = [
        {
            id: "chat",
            title: "Chat Assistant",
            icon: "chatbubble-ellipses",
            route: "/chat",
            colors: ["#6366f1", "#8b5cf6"],
        },
        {
            id: "maintenance",
            title: "Maintenance",
            icon: "build",
            route: "/MaintenanceTracking",
            colors: ["#8b5cf6", "#d946ef"],
        },
        {
            id: "history",
            title: "History",
            icon: "time",
            route: "/HistoryPage",
            colors: ["#6366f1", "#8b5cf6"],
        },
        {
            id: "profile",
            title: "Profile",
            icon: "person",
            route: "/profile",
            colors: ["#8b5cf6", "#d946ef"],
        },
    ];

    // Vehicle health items
    const healthItems = [
        {
            icon: "speedometer",
            label: "Engine",
            value: "Normal",
            color: "#10b981",
        },
        {
            icon: "battery-charging",
            label: "Battery",
            value: "Good",
            color: "#6366f1",
        },
        {
            icon: "water",
            label: "Fuel",
            value: "—",
            color: "#f59e0b",
        },
        {
            icon: "sync",
            label: "Updated",
            value: "Just now",
            color: "#94a3b8",
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Background gradient */}
            <LinearGradient
                colors={["#1e293b", "#0f172a", "#0f172a"]}
                style={styles.backgroundGradient}
            />

            {/* Popup Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={styles.modalContent}>
                        <Animated.View
                            entering={FadeInDown.duration(200)}
                            style={styles.popupMenu}
                        >
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setShowMenu(false);
                                    router.push("/profile");
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="person-outline" size={20} color="#f1f5f9" />
                                <Text style={styles.menuText}>Profile</Text>
                            </TouchableOpacity>

                            <View style={styles.menuDivider} />

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setShowMenu(false);
                                    signOut();
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                                <Text style={[styles.menuText, { color: "#ef4444" }]}>Logout</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Header Section */}
                <Animated.View entering={FadeInDown.duration(700)} style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <View style={styles.heroTextContainer}>
                            <Text style={styles.greeting}>Hello, {user?.firstName || "there"} </Text>
                            <Text style={styles.heroSubtitle}>Your vehicle is ready</Text>
                        </View>

                        {/* Avatar with gradient ring */}
                        <Animated.View entering={ZoomIn.delay(300).duration(700).springify()}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setShowMenu(!showMenu)}
                            >
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
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Vehicle badge and Logout button row */}
                    <View style={styles.badgeLogoutRow}>
                        <View style={styles.vehicleBadge}>
                            <Ionicons name="car-sport" size={16} color="#a5b4fc" />
                            <Text style={styles.vehicleName}>{vehicleDisplayName}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={() => signOut()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Quick Actions Section */}
                <View style={styles.actionsSection}>
                    <Animated.View entering={FadeInUp.duration(700).delay(200)}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                    </Animated.View>

                    <View style={styles.actionsGrid}>
                        {quickActions.map((action, index) => {
                            const { animatedStyle, onPressIn, onPressOut } = createPressAnimation();

                            return (
                                <Animated.View
                                    key={action.id}
                                    entering={FadeInUp.duration(700).delay(300 + index * 80)}
                                    style={[styles.actionCardWrapper, animatedStyle]}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPressIn={onPressIn}
                                        onPressOut={onPressOut}
                                        onPress={() => router.push(action.route)}
                                    >
                                        <View style={styles.actionCard}>
                                            <LinearGradient
                                                colors={action.colors}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.actionIconContainer}
                                            >
                                                <Ionicons name={action.icon} size={26} color="#ffffff" />
                                            </LinearGradient>

                                            <Text style={styles.actionTitle}>{action.title}</Text>

                                            <View style={styles.actionArrow}>
                                                <Ionicons name="arrow-forward" size={16} color="#64748b" />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                </View>

                {/* Vehicle Health Card (Glass) */}
                <Animated.View
                    entering={FadeInUp.duration(700).delay(600)}
                    style={styles.healthCard}
                >
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Vehicle Health</Text>
                        <View style={styles.healthStatusBadge}>
                            <View style={styles.healthDot} />
                            <Text style={styles.healthStatusText}>All Good</Text>
                        </View>
                    </View>

                    <View style={styles.healthGrid}>
                        {healthItems.map((item, index) => (
                            <View key={item.label} style={styles.healthItem}>
                                <View style={[styles.healthIconContainer, { backgroundColor: `${item.color}20` }]}>
                                    <Ionicons name={item.icon} size={22} color={item.color} />
                                </View>
                                <Text style={styles.healthLabel}>{item.label}</Text>
                                <Text style={styles.healthValue}>{item.value}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>


                {/* Recent Activity Card */}
                <Animated.View
                    entering={FadeInUp.duration(700).delay(700)}
                    style={styles.activityCard}
                >
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Recent Activity</Text>
                    </View>

                    {activityLoading ? (
                        <View style={styles.activityLoading}>
                            <ActivityIndicator size="small" color="#6366f1" />
                        </View>
                    ) : recentActivity.length === 0 ? (
                        <View style={styles.activityEmpty}>
                            <Ionicons name="time-outline" size={32} color="#475569" />
                            <Text style={styles.activityEmptyText}>No recent activity</Text>
                        </View>
                    ) : (
                        <View style={styles.activityList}>
                            {recentActivity.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.activityItem}
                                    onPress={item.onPress}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.activityIcon, { backgroundColor: item.bgColor }]}>
                                        <Ionicons name={item.icon} size={18} color={item.color} />
                                    </View>
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.activityTime}>{formatRelativeTime(item.date)}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#475569" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* Footer spacing */}
                <View style={styles.footer} />
            </ScrollView>
        </View>
    );
}

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
        height: 400,
    },
    scrollContent: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    // ── Hero Section ──
    heroSection: {
        marginBottom: 28,
    },
    heroContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    heroTextContainer: {
        flex: 1,
    },
    greeting: {
        fontSize: 28,
        fontWeight: "800",
        color: "#f1f5f9",
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontSize: 15,
        color: "#94a3b8",
        fontWeight: "500",
        marginBottom: 12,
    },
    badgeLogoutRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: 12,
    },
    vehicleBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(99,102,241,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "rgba(99,102,241,0.2)",
        gap: 6,
    },
    vehicleName: {
        fontSize: 13,
        fontWeight: "600",
        color: "#a5b4fc",
        letterSpacing: 0.3,
    },
    avatarRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        padding: 3,
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 29,
        backgroundColor: "#27374D",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 28,
        fontWeight: "800",
        color: "#f1f5f9",
    },
    logoutButton: {
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: "rgba(239,68,68,0.12)",
        borderWidth: 1,
        borderColor: "rgba(239,68,68,0.2)",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    modalContent: {
        position: "absolute",
        top: 120,
        right: 20,
    },
    popupMenu: {
        backgroundColor: "rgba(30,41,59,0.95)",
        borderRadius: 16,
        padding: 8,
        minWidth: 160,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.2)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 12,
        borderRadius: 12,
    },
    menuText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#f1f5f9",
    },
    menuDivider: {
        height: 1,
        backgroundColor: "rgba(148,163,184,0.15)",
        marginVertical: 4,
    },

    // ── Vehicle Health Card ──
    healthCard: {
        backgroundColor: "rgba(30,41,59,0.65)",
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.15)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#f1f5f9",
        letterSpacing: 0.3,
    },
    healthStatusBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(16,185,129,0.15)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    healthDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#10b981",
    },
    healthStatusText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#10b981",
    },
    healthGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    healthItem: {
        width: "47%",
        backgroundColor: "rgba(51,65,85,0.4)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.1)",
    },
    healthIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    healthLabel: {
        fontSize: 13,
        color: "#94a3b8",
        fontWeight: "500",
        marginBottom: 4,
    },
    healthValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#f1f5f9",
    },

    // ── Quick Actions Section ──
    actionsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#f1f5f9",
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    actionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    actionCardWrapper: {
        width: "47%",
    },
    actionCard: {
        backgroundColor: "rgba(30,41,59,0.65)",
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.15)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    actionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#f1f5f9",
        marginBottom: 8,
    },
    actionArrow: {
        alignSelf: "flex-start",
    },

    // ── Recent Activity Card ──
    activityCard: {
        backgroundColor: "rgba(30,41,59,0.65)",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.15)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    activityLoading: {
        paddingVertical: 24,
        alignItems: "center",
    },
    activityEmpty: {
        paddingVertical: 24,
        alignItems: "center",
        gap: 8,
    },
    activityEmptyText: {
        fontSize: 14,
        color: "#475569",
        fontWeight: "500",
    },
    activityList: {
        gap: 14,
    },
    activityItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(51,65,85,0.3)",
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.08)",
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#f1f5f9",
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 13,
        color: "#94a3b8",
        fontWeight: "500",
    },

    // ── Footer ──
    footer: {
        height: 20,
    },
});