import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

export default function Login() {
  const { signIn, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = useCallback(async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        console.log("✅ Google sign-in successful!");
        router.replace("/chat");
      } else {
        throw new Error("Failed to create session");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      Alert.alert(
        "Sign In Failed", 
        err?.errors?.[0]?.message || err?.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, startOAuthFlow, router]);

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>AutoVitals</Text>
        <Text style={styles.subtitle}>Your AI Companion</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={styles.welcomeText}>
            Sign in to continue your conversation
          </Text>
        </View>

        {/* Google Sign In Button */}
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.googleIconWrapper}>
            <Ionicons name="logo-google" size={22} color="#27374D" />
          </View>
          <Text style={styles.googleText}>
            {loading ? "Signing in..." : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Alternative Options */}
        <TouchableOpacity style={styles.emailBtn} activeOpacity={0.8}>
          <Ionicons name="mail-outline" size={20} color="#526D82" />
          <Text style={styles.emailText}>Sign in with Email</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Don't have an account?{" "}
          <Link href="/signup" style={styles.signupLink}>
            Sign up
          </Link>
        </Text>
        
        <Text style={styles.termsText}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#9DB2BF",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  welcomeBox: {
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#27374D",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: "#526D82",
    lineHeight: 22,
  },
  googleBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#9DB2BF",
    shadowColor: "#27374D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#9DB2BF",
  },
  googleText: {
    color: "#27374D",
    fontSize: 17,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#9DB2BF",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#526D82",
    fontSize: 14,
    fontWeight: "500",
  },
  emailBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#526D82",
  },
  emailText: {
    color: "#526D82",
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 10,
  },
  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 30,
    paddingBottom: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 15,
    color: "#526D82",
    marginBottom: 16,
  },
  signupLink: {
    color: "#27374D",
    fontWeight: "700",
  },
  termsText: {
    fontSize: 12,
    color: "#9DB2BF",
    textAlign: "center",
    lineHeight: 18,
  },
});