import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your official employee email / code and password.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.success) {
      setError(res.message || "Invalid email or password. Please check your credentials.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>SA</Text>
              <View style={styles.logoSparkle}>
                <Sparkles size={10} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.title}>Smart Attendance</Text>
            <Text style={styles.subtitle}>AI Biometrics & Geofence Work Portal</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Employee Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Enter your official company credentials to access your dashboard
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color="#E11D48" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Official Email / Employee ID</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter employee email or code"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (error) setError(null);
                  }}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#94A3B8" />
                  ) : (
                    <Eye size={18} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In to Work</Text>
                  <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Protected with AI Facial Biometric Encryption & 256-bit Cloud Security
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  inner: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    justifyContent: "center",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    backgroundColor: "#00B050",
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    position: "relative",
  },
  logoSparkle: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#E11D48",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    flexDirection: "row",
    backgroundColor: "#00B050",
    borderRadius: 16,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 24,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
