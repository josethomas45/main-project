import { useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignUp() {
  const { signUp, isLoaded } = useSignUp();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin,
      });
      // Navigation will be handled automatically by _layout.jsx
      console.log("✅ Google sign-up initiated!");
    } catch (err) {
      console.error("Google sign-up error:", err);
      Alert.alert("Sign Up Failed", err.errors?.[0]?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>

      <TouchableOpacity
        style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
        onPress={handleGoogleSignUp}
        disabled={loading}
      >
        <Ionicons name="logo-google" size={20} color="#fff" style={styles.icon} />
        <Text style={styles.googleText}>
          {loading ? "Signing up..." : "Continue with Google"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.bottomText}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#007bff" }}>
          Login
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 16, marginBottom: 35, color: "#666" },
  googleBtn: {
    backgroundColor: "#4285F4",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  googleBtnDisabled: {
    backgroundColor: "#A0C4FF",
  },
  icon: {
    marginRight: 10,
  },
  googleText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bottomText: { marginTop: 20, textAlign: "center", color: "#444" },
});