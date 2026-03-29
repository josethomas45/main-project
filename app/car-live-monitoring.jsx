import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useVehicle } from "../contexts/VehicleContext";
import Sidebar from "../components/Sidebar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Simulated live metric generator ──────────────────────────────────────────
function generateMetrics(prev) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const jitter = (v, delta) => v + (Math.random() - 0.5) * delta;

  return {
    speed:       clamp(jitter(prev?.speed       ?? 60,  8), 0,   220),
    rpm:         clamp(jitter(prev?.rpm         ?? 2200, 300), 600, 7000),
    engineTemp:  clamp(jitter(prev?.engineTemp  ?? 92,  2), 60,  130),
    fuelLevel:   clamp(jitter(prev?.fuelLevel   ?? 68,  0.4), 0,  100),
    battery:     clamp(jitter(prev?.battery     ?? 12.6, 0.05), 10, 15),
    oilPressure: clamp(jitter(prev?.oilPressure ?? 42,  2), 20,  80),
    throttle:    clamp(jitter(prev?.throttle    ?? 28,  5), 0,   100),
    tireFL:      clamp(jitter(prev?.tireFL      ?? 34,  0.3), 25, 45),
    tireFR:      clamp(jitter(prev?.tireFR      ?? 33,  0.3), 25, 45),
    tireRL:      clamp(jitter(prev?.tireRL      ?? 33,  0.3), 25, 45),
    tireRR:      clamp(jitter(prev?.tireRR      ?? 34,  0.3), 25, 45),
    latitude:    clamp(jitter(prev?.latitude    ?? 37.7749, 0.001), -90, 90),
    longitude:   clamp(jitter(prev?.longitude   ?? -122.4194, 0.001), -180, 180),
  };
}

// ── Arc Gauge ─────────────────────────────────────────────────────────────────
function ArcGauge({ value, max, label, unit, colors, size = 130 }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value / max,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const pct = value / max;
  const r = 48;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const circumference = Math.PI * r; // semicircle
  const offset = circumference * (1 - pct);

  const statusColor =
    pct > 0.85 ? "#ef4444" : pct > 0.65 ? "#f59e0b" : colors[0];

  return (
    <View style={{ alignItems: "center", width: size }}>
      {/* SVG-style arc using a rotated View trick */}
      <View style={{ width: size, height: size * 0.7, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        {/* Background track */}
        <View
          style={{
            position: "absolute",
            width: r * 2 + 8,
            height: r + 4,
            borderTopLeftRadius: r + 4,
            borderTopRightRadius: r + 4,
            borderWidth: 6,
            borderColor: "rgba(148,163,184,0.1)",
            borderBottomColor: "transparent",
            top: 0,
          }}
        />
        {/* Filled arc using a clip overlay */}
        <View
          style={{
            position: "absolute",
            width: r * 2 + 8,
            height: r + 4,
            top: 0,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: r * 2 + 8,
              height: r + 4,
              borderTopLeftRadius: r + 4,
              borderTopRightRadius: r + 4,
              borderWidth: 6,
              borderColor: statusColor,
              borderBottomColor: "transparent",
              opacity: 0.9,
              transform: [{ scaleX: Math.min(1, pct * 2) }],
              transformOrigin: "left",
            }}
          />
        </View>

        {/* Center value */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: statusColor }}>
            {Math.round(value)}
          </Text>
          <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600" }}>{unit}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: "#94a3b8", fontWeight: "600", textAlign: "center" }}>{label}</Text>
    </View>
  );
}

// ── Metric Row Item ───────────────────────────────────────────────────────────
function MetricItem({ icon, label, value, unit, color, bgColor, barPct }) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: barPct,
      duration: 300, // shortened: completes fast, reduces JS thread pressure
      useNativeDriver: false,
    }).start();
  }, [barPct]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={metricStyles.item}>
      <View style={[metricStyles.iconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={metricStyles.label}>{label}</Text>
          <Text style={[metricStyles.value, { color }]}>
            {typeof value === "number" ? value.toFixed(1) : value}
            <Text style={metricStyles.unit}> {unit}</Text>
          </Text>
        </View>
        <View style={metricStyles.barTrack}>
          <Animated.View
            style={[
              metricStyles.barFill,
              { width: barWidth, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
  value: { fontSize: 14, fontWeight: "700" },
  unit: { fontSize: 11, fontWeight: "500", color: "#64748b" },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(148,163,184,0.12)",
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },
});

// ── Tire Pressure Map ─────────────────────────────────────────────────────────
function TireMap({ tireFL, tireFR, tireRL, tireRR }) {
  const tireColor = (v) =>
    v < 30 ? "#ef4444" : v < 32 ? "#f59e0b" : "#10b981";

  const TireBadge = ({ label, value, position }) => (
    <View style={[tireMapStyles.badge, tireMapStyles[position]]}>
      <Text style={tireMapStyles.badgeLabel}>{label}</Text>
      <Text style={[tireMapStyles.badgeValue, { color: tireColor(value) }]}>
        {value.toFixed(0)} PSI
      </Text>
    </View>
  );

  return (
    <View style={tireMapStyles.container}>
      <View style={tireMapStyles.carOutline}>
        <Ionicons name="car-sport" size={64} color="rgba(99,102,241,0.4)" />
      </View>
      <TireBadge label="FL" value={tireFL} position="topLeft" />
      <TireBadge label="FR" value={tireFR} position="topRight" />
      <TireBadge label="RL" value={tireRL} position="bottomLeft" />
      <TireBadge label="RR" value={tireRR} position="bottomRight" />
    </View>
  );
}

const tireMapStyles = StyleSheet.create({
  container: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  carOutline: { position: "absolute" },
  badge: {
    position: "absolute",
    backgroundColor: "rgba(15,23,42,0.7)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    alignItems: "center",
  },
  topLeft:     { top: 0, left: 0 },
  topRight:    { top: 0, right: 0 },
  bottomLeft:  { bottom: 0, left: 0 },
  bottomRight: { bottom: 0, right: 0 },
  badgeLabel: { fontSize: 10, color: "#64748b", fontWeight: "700" },
  badgeValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
});

// ── Status Pill ───────────────────────────────────────────────────────────────
function StatusPill({ label, ok }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
        gap: 6,
        margin: 4,
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: ok ? "#10b981" : "#ef4444",
        }}
      />
      <Text style={{ fontSize: 12, fontWeight: "600", color: ok ? "#10b981" : "#ef4444" }}>
        {label}
      </Text>
    </View>
  );
}

// ── Pulse dot ─────────────────────────────────────────────────────────────────
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#10b981",
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CarLiveMonitoring() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { currentVehicle, clearVehicle } = useVehicle();
  const router = useRouter();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [metrics, setMetrics] = useState(generateMetrics(null));
  const [isLive, setIsLive] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const intervalRef = useRef(null);
  // Single interval drives both data refresh and elapsed counter
  // — reduces from 2 setIntervals to 1, cutting JS thread wakeups by half
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!isLive) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setMetrics((prev) => generateMetrics(prev));
      elapsedRef.current += 2; // 2s tick
      setElapsed(elapsedRef.current);
    }, 2500); // 2.5s: enough to feel live, light on the JS thread
    return () => clearInterval(intervalRef.current);
  }, [isLive]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const vehicleName = currentVehicle?.model
    ? `${currentVehicle.year || ""} ${currentVehicle.make || ""} ${currentVehicle.model}`.trim()
    : currentVehicle?.vin
    ? `VIN: ${currentVehicle.vin}`
    : "My Vehicle";

  const engineTempOk = metrics.engineTemp < 110;
  const batteryOk    = metrics.battery > 11.5;
  const oilOk        = metrics.oilPressure > 25;
  const fuelOk       = metrics.fuelLevel > 15;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* BG Gradient */}
      <LinearGradient
        colors={["#1e293b", "#0f172a", "#0f172a"]}
        style={styles.bgGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color="#f1f5f9" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Live Monitoring</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <PulseDot />
            <Text style={styles.headerSub}>
              {isLive ? "LIVE" : "PAUSED"} · {formatTime(elapsed)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsLive((v) => !v)}
          style={[
            styles.headerBtn,
            { backgroundColor: isLive ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.18)" },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLive ? "pause" : "play"}
            size={20}
            color={isLive ? "#ef4444" : "#10b981"}
          />
        </TouchableOpacity>
      </View>

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      >
        {/* Vehicle banner */}
        <View style={styles.vehicleBanner}>
          <LinearGradient
            colors={["rgba(99,102,241,0.25)", "rgba(139,92,246,0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.vehicleBannerInner}
          >
            <Ionicons name="car-sport" size={22} color="#a5b4fc" />
            <Text style={styles.vehicleBannerText}>{vehicleName}</Text>
            <View
              style={{
                backgroundColor: "rgba(16,185,129,0.2)",
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "700" }}>
                ACTIVE
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Speed + RPM Gauges ── */}
        <View style={styles.card}>
          <SectionTitle icon="speedometer-outline" title="Speed & RPM" />
          <View style={{ flexDirection: "row", justifyContent: "space-around", paddingTop: 8 }}>
            <ArcGauge
              value={metrics.speed}
              max={220}
              label="Speed"
              unit="km/h"
              colors={["#6366f1", "#8b5cf6"]}
            />
            <ArcGauge
              value={metrics.rpm}
              max={7000}
              label="Engine RPM"
              unit="RPM"
              colors={["#8b5cf6", "#d946ef"]}
            />
            <ArcGauge
              value={metrics.throttle}
              max={100}
              label="Throttle"
              unit="%"
              colors={["#f59e0b", "#ef4444"]}
            />
          </View>
        </View>

        {/* ── Engine Health ── */}
        <View style={styles.card}>
          <SectionTitle icon="flame-outline" title="Engine Health" />
          <MetricItem
            icon="thermometer-outline"
            label="Engine Temperature"
            value={metrics.engineTemp}
            unit="°C"
            color={metrics.engineTemp > 105 ? "#ef4444" : "#f59e0b"}
            bgColor={metrics.engineTemp > 105 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)"}
            barPct={metrics.engineTemp / 130}
          />
          <MetricItem
            icon="water-outline"
            label="Oil Pressure"
            value={metrics.oilPressure}
            unit="PSI"
            color="#6366f1"
            bgColor="rgba(99,102,241,0.12)"
            barPct={metrics.oilPressure / 80}
          />
          <MetricItem
            icon="flash-outline"
            label="Battery Voltage"
            value={metrics.battery}
            unit="V"
            color="#10b981"
            bgColor="rgba(16,185,129,0.12)"
            barPct={(metrics.battery - 10) / 5}
          />
          <MetricItem
            icon="car-outline"
            label="Fuel Level"
            value={metrics.fuelLevel}
            unit="%"
            color="#f59e0b"
            bgColor="rgba(245,158,11,0.12)"
            barPct={metrics.fuelLevel / 100}
          />
        </View>

        {/* ── Tire Pressure ── */}
        <View style={styles.card}>
          <SectionTitle icon="ellipse-outline" title="Tire Pressure" />
          <TireMap
            tireFL={metrics.tireFL}
            tireFR={metrics.tireFR}
            tireRL={metrics.tireRL}
            tireRR={metrics.tireRR}
          />
          <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
            {[
              { label: "Front Left",  v: metrics.tireFL },
              { label: "Front Right", v: metrics.tireFR },
              { label: "Rear Left",   v: metrics.tireRL },
              { label: "Rear Right",  v: metrics.tireRR },
            ].map(({ label, v }) => (
              <View key={label} style={styles.tirePill}>
                <Text style={styles.tirePillLabel}>{label}</Text>
                <Text
                  style={[
                    styles.tirePillValue,
                    { color: v < 30 ? "#ef4444" : v < 32 ? "#f59e0b" : "#10b981" },
                  ]}
                >
                  {v.toFixed(0)} PSI
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── System Status ── */}
        <View style={styles.card}>
          <SectionTitle icon="shield-checkmark-outline" title="System Status" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
            <StatusPill label="Engine Temp"   ok={engineTempOk} />
            <StatusPill label="Battery"       ok={batteryOk} />
            <StatusPill label="Oil Pressure"  ok={oilOk} />
            <StatusPill label="Fuel Level"    ok={fuelOk} />
            <StatusPill label="ABS"           ok={true} />
            <StatusPill label="Airbag"        ok={true} />
            <StatusPill label="Traction Ctrl" ok={true} />
            <StatusPill label="Check Engine"  ok={true} />
          </View>
        </View>

        {/* ── GPS ── */}
        <View style={styles.card}>
          <SectionTitle icon="navigate-outline" title="GPS Location" />
          <View style={styles.gpsRow}>
            <View style={styles.gpsField}>
              <Text style={styles.gpsLabel}>Latitude</Text>
              <Text style={styles.gpsValue}>{metrics.latitude.toFixed(5)}°</Text>
            </View>
            <View style={[styles.gpsField, { borderLeftWidth: 1, borderLeftColor: "rgba(148,163,184,0.1)" }]}>
              <Text style={styles.gpsLabel}>Longitude</Text>
              <Text style={styles.gpsValue}>{metrics.longitude.toFixed(5)}°</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.gpsButton}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gpsButtonInner}
            >
              <Ionicons name="map-outline" size={16} color="#fff" />
              <Text style={styles.gpsButtonText}>Open in Maps</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Section Title helper ───────────────────────────────────────────────────────
function SectionTitle({ icon, title }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <View style={styles.sectionIconBox}>
        <Ionicons name={icon} size={18} color="#8b5cf6" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  bgGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 400 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(30,41,59,0.5)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
    zIndex: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: 1.2,
  },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  // Vehicle banner
  vehicleBanner: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.3)",
  },
  vehicleBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  vehicleBannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#e2e8f0",
    letterSpacing: 0.2,
  },

  // Card
  card: {
    backgroundColor: "rgba(30,41,59,0.75)",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  // Section title
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(139,92,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
    letterSpacing: 0.3,
  },

  // Tire pills
  tirePill: {
    backgroundColor: "rgba(30,41,59,0.8)",
    borderRadius: 12,
    padding: 10,
    margin: 4,
    alignItems: "center",
    width: (SCREEN_WIDTH - 36 - 40 - 24) / 2,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
  },
  tirePillLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  tirePillValue: { fontSize: 15, fontWeight: "800", marginTop: 4 },

  // GPS
  gpsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  gpsField: { flex: 1, paddingHorizontal: 8, alignItems: "center" },
  gpsLabel: { fontSize: 12, color: "#64748b", fontWeight: "600", marginBottom: 4 },
  gpsValue: { fontSize: 15, fontWeight: "700", color: "#a5b4fc" },
  gpsButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  gpsButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
