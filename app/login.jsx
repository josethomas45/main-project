import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Required for OAuth flow to complete
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width * 0.9, 440);

export default function Login() {
  const { signIn, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const googleScale = useSharedValue(1);
  const animatedGoogleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: googleScale.value }],
  }));

  const onGooglePressIn = () => {
    googleScale.value = withTiming(0.96, { duration: 140 });
  };

  const onGooglePressOut = () => {
    googleScale.value = withTiming(1, { duration: 160 });
  };

  const handleGoogleSignIn = useCallback(async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        console.log("Google sign-in successful");
        router.replace("/dashboard");
      } else {
        throw new Error("No session created");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      Alert.alert(
        "Sign In Failed",
        err?.errors?.[0]?.message || err?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, startOAuthFlow, router]);

  return (
    <LinearGradient
      colors={["#27374D", "#3a506b", "#526D82"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <Animated.View entering={FadeIn.duration(560)} style={styles.container}>
        <View style={styles.card}>
          {/* Branding / Logo area */}
          <Animated.View
            entering={FadeInDown.duration(700).delay(80)}
            style={styles.header}
          >
            <Ionicons name="sparkles-sharp" size={38} color="#FFFFFF" />
            <Text style={styles.appName}>AutoVitals</Text>
            <Text style={styles.tagline}>Your AI Companion</Text>
          </Animated.View>

          {/* Welcome message */}
          <Animated.View
            entering={FadeInUp.duration(720).delay(280)}
            style={styles.welcomeContainer}
          >
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to continue your conversations
            </Text>
          </Animated.View>

          {/* Google Sign-In Button */}
          <Animated.View entering={FadeInUp.duration(720).delay(480)}>
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={onGooglePressIn}
              onPressOut={onGooglePressOut}
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={styles.buttonWrapper}
            >
              <Animated.View
                style={[
                  styles.googleButton,
                  loading && styles.googleButtonDisabled,
                  animatedGoogleStyle,
                ]}
              >
                <Ionicons
                  name="logo-google"
                  size={18}
                  color="#4285F4"
                />
                <Text style={styles.googleButtonText}>
                  {loading ? "Signing in…" : "Continue with Google"}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeIn.duration(800).delay(680)}
            style={styles.dividerRow}
          >
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Email sign-in (placeholder) */}
          <Animated.View entering={FadeInUp.duration(720).delay(880)}>
            <TouchableOpacity
              style={styles.emailButton}
              activeOpacity={0.75}
            // onPress={() => router.push("/(auth)/email-signin")}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color="#526D82"
              />
              <Text style={styles.emailButtonText}>Sign in with email</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeIn.duration(800).delay(1080)}
            style={styles.footer}
          >
            <Text style={styles.signupPrompt}>
              Don't have an account?{" "}
              <Link href="/signup" style={styles.signupLink}>
                Sign up
              </Link>
            </Text>

            <Text style={styles.termsText}>
              By continuing, you agree to our{"\n"}
              <Text style={styles.termsLink}>Terms</Text> &{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 44,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.24,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  header: {
    alignItems: "center",
    marginBottom: 44,
  },
  appName: {
    fontSize: 34,
    fontWeight: "700",
    color: "#27374D",
    marginTop: 12,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 15.5,
    color: "#526D82",
    marginTop: 4,
    fontWeight: "500",
  },

  welcomeContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 27,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15.5,
    color: "#526D82",
    textAlign: "center",
    lineHeight: 22,
  },

  buttonWrapper: {
    width: "100%",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
  },
  googleButtonDisabled: {
    opacity: 0.65,
  },
  googleButtonText: {
    fontSize: 16.5,
    fontWeight: "600",
    color: "#1f2a44",
    marginLeft: 3,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9DB2BF",
    fontWeight: "500",
  },

  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 16,
    width: "100%",
  },
  emailButtonText: {
    fontSize: 16.5,
    fontWeight: "600",
    color: "#526D82",
    marginLeft: 2,
  },

  footer: {
    marginTop: 36,
    alignItems: "center",
  },
  signupPrompt: {
    fontSize: 15,
    color: "#526D82",
    marginBottom: 16,
  },
  signupLink: {
    color: "#27374D",
    fontWeight: "700",
  },
  termsText: {
    fontSize: 12.5,
    color: "#9DB2BF",
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: "#526D82",
    textDecorationLine: "underline",
  },
});