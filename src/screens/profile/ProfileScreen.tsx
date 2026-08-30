import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  User,
  Building2,
  Clock,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Briefcase,
  Sparkles,
  MapPin,
  QrCode,
  Calendar,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { attendanceService, OFFICE_TIMINGS, RegisteredFaceData } from "../../services/attendanceService";

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const [faceData, setFaceData] = useState<RegisteredFaceData>({ registered: false });

  const loadFaceData = async () => {
    const data = await attendanceService.getRegisteredFace();
    setFaceData(data);
  };

  useEffect(() => {
    loadFaceData();
    const unsubscribe = navigation.addListener("focus", () => {
      loadFaceData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Smart Attendance?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.fullName || "EM").substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.fullName || user?.name || "Arif Chowdhury"}</Text>
          <Text style={styles.code}>
            {user?.employeeCode || "EMP-1029"} · {user?.designation || "Senior Software Engineer"}
          </Text>
          <Text style={styles.email}>{user?.email || "arif.c@vertextech.io"}</Text>

          <View style={styles.badgeContainer}>
            <View style={styles.statusPill}>
              <ShieldCheck size={13} color="#00B050" />
              <Text style={styles.statusPillText}>
                {faceData.registered ? "Face Biometric Active" : "Face ID Pending Setup"}
              </Text>
            </View>
          </View>
        </View>

        {/* Digital Credentials & ID Card */}
        <Text style={styles.sectionTitle}>Digital Credentials</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("IDCard")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#F0FDF4" }]}>
              <QrCode size={20} color="#00B050" />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Digital Employee ID Card</Text>
              <Text style={styles.menuSub}>NFC badge, QR code & company identification</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate("FaceRegistration")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Camera size={20} color="#2563EB" />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Facial Biometric Setup</Text>
              <Text style={styles.menuSub}>
                {faceData.registered ? "Re-scan / update stored facial template" : "Scan and register face"}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Employment Information */}
        <Text style={styles.sectionTitle}>Employment Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Briefcase size={16} color="#64748B" />
              <Text style={styles.infoLabel}>Department</Text>
            </View>
            <Text style={styles.infoVal}>{user?.department || "Engineering & AI Tech"}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Building2 size={16} color="#64748B" />
              <Text style={styles.infoLabel}>Branch Office</Text>
            </View>
            <Text style={styles.infoVal}>{user?.branch || "Main HQ Office"}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Clock size={16} color="#64748B" />
              <Text style={styles.infoLabel}>Office Shift</Text>
            </View>
            <Text style={styles.infoVal}>{OFFICE_TIMINGS.shiftStart} - {OFFICE_TIMINGS.shiftEnd}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <MapPin size={16} color="#00B050" />
              <Text style={styles.infoLabel}>Geofence Radius</Text>
            </View>
            <Text style={[styles.infoVal, { color: "#00B050", fontWeight: "800" }]}>
              100m Perimeter Active
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#E11D48" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out of Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: "#00B050",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  name: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },
  code: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  email: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  badgeContainer: {
    marginTop: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusPillText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    marginTop: 6,
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  menuSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  logoutBtn: {
    flexDirection: "row",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnText: {
    color: "#E11D48",
    fontSize: 14,
    fontWeight: "800",
  },
});
