import { useOAuth, useSignUp } from "@clerk/clerk-expo";
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
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

export default function SignUp() {
  const { signUp, isLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignUp = useCallback(async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        console.log("✅ Google sign-up successful!");
        router.replace("/chat");
      } else {
        throw new Error("Failed to create session");
      }
    } catch (err) {
      console.error("Google sign-up error:", err);
      Alert.alert(
        "Sign Up Failed",
        err?.errors?.[0]?.message || err?.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, startOAuthFlow, router]);

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(1000).springify()}
        style={styles.header}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="person-add" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Vasu The Mech today</Text>
      </Animated.View>

      {/* Main Content */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(1000).springify()}
        style={styles.content}
      >
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Get Started!</Text>
          <Text style={styles.welcomeText}>
            Create your account to start chatting with AI
          </Text>
        </View>

        {/* Google Sign Up Button */}
        <Animated.View entering={FadeInDown.delay(600).duration(1000).springify()}>
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
            onPress={handleGoogleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.googleIconWrapper}>
              <Ionicons name="logo-google" size={22} color="#27374D" />
            </View>
            <Text style={styles.googleText}>
              {loading ? "Creating account..." : "Sign up with Google"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Divider */}
        <Animated.View
          entering={FadeIn.delay(800).duration(1000)}
          style={styles.divider}
        >
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Alternative Options */}
        <Animated.View entering={FadeInDown.delay(1000).duration(1000).springify()}>
          <TouchableOpacity style={styles.emailBtn} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={20} color="#526D82" />
            <Text style={styles.emailText}>Sign up with Email</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Animated.View
            entering={FadeInDown.delay(1200).duration(800).springify()}
            style={styles.featureItem}
          >
            <Ionicons name="checkmark-circle" size={20} color="#526D82" />
            <Text style={styles.featureText}>Free to use</Text>
          </Animated.View>
          <Animated.View
            entering={FadeInDown.delay(1400).duration(800).springify()}
            style={styles.featureItem}
          >
            <Ionicons name="checkmark-circle" size={20} color="#526D82" />
            <Text style={styles.featureText}>AI-powered responses</Text>
          </Animated.View>
          <Animated.View
            entering={FadeInDown.delay(1600).duration(800).springify()}
            style={styles.featureItem}
          >
            <Ionicons name="checkmark-circle" size={20} color="#526D82" />
            <Text style={styles.featureText}>Secure & private</Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Footer */}
      <Animated.View
        entering={FadeIn.delay(1800).duration(1000)}
        style={styles.footer}
      >
        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Link href="/login" style={styles.loginLink}>
            Sign in
          </Link>
        </Text>

        <Text style={styles.termsText}>
          By signing up, you agree to our Terms & Privacy Policy
        </Text>
      </Animated.View>
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
    paddingTop: 70,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#526D82",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(157, 178, 191, 0.2)",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#9DB2BF",
    letterSpacing: 1,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 32,
    paddingTop: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 0,
  },
  welcomeBox: {
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#27374D",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: "#526D82",
    lineHeight: 24,
    fontWeight: "500",
  },
  googleBtn: {
    backgroundColor: "#27374D",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#27374D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  googleBtnDisabled: {
    opacity: 0.7,
    backgroundColor: "#526D82",
  },
  googleIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  googleText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#9DB2BF",
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#9DB2BF",
    fontSize: 14,
    fontWeight: "600",
  },
  emailBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#526D82",
    marginBottom: 32,
  },
  emailText: {
    color: "#526D82",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  featuresContainer: {
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  featureText: {
    marginLeft: 16,
    fontSize: 16,
    color: "#526D82",
    fontWeight: "500",
    letterSpacing: 0.3,
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
  loginLink: {
    color: "#27374D",
    fontWeight: "800",
  },
  termsText: {
    fontSize: 12,
    color: "#9DB2BF",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});