import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
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
  MapPin,
  QrCode,
  Calendar,
  Phone,
  Mail,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { attendanceService, OFFICE_TIMINGS, RegisteredFaceData } from "../../services/attendanceService";
import { authApi } from "../../api/auth";
import { branchApi } from "../../api/branch";

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const [profileDetails, setProfileDetails] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [faceData, setFaceData] = useState<RegisteredFaceData>({ registered: false });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchCompleteUserInfo = async () => {
    try {
      // 1. Fetch full employee details from /api/auth/me
      const profileRes: any = await authApi.getProfile();
      if (profileRes?.success && profileRes?.data) {
        setProfileDetails(profileRes.data);
      } else if (profileRes && (profileRes.fullName || profileRes.email)) {
        setProfileDetails(profileRes);
      }

      // 2. Fetch assigned branch info
      try {
        const branchRes = await branchApi.getBranchLocation();
        console.log(branchRes)
        if (branchRes?.success && branchRes?.data) {
          setBranchInfo(branchRes.data);
        }
      } catch (bErr) {
        console.log("Branch fetch note:", bErr);
      }

      // 3. Fetch face biometrics status
      const face = await attendanceService.getRegisteredFace();
      setFaceData(face);
    } catch (err) {
      console.log("Error loading full profile info:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompleteUserInfo();

    const unsubscribe = navigation.addListener("focus", () => {
      fetchCompleteUserInfo();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompleteUserInfo();
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Smart Attendance?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  // Profile Data Mapping with intelligent fallbacks
  const displayName = profileDetails?.fullName || user?.fullName || user?.name || "MD ANTOR MIA";
  const displayEmail = profileDetails?.email || user?.email || "antor@gmail.com";
  
  // Format code from raw userId (emp-1788119345526-469 -> EMP-469)
  const employeeIdRaw = profileDetails?.id || profileDetails?.userId || user?.userId || "emp-1788119345526-469";
  const displayCode = profileDetails?.employeeCode 
    || user?.employeeCode 
    || `EMP-${employeeIdRaw.split("-").pop()}`;

  const displayDesignation = profileDetails?.designation 
    || user?.designation 
    || (user?.role === "EMPLOYEE" ? "Front-End Web Developer" : "System Administrator");

  const displayDepartment = profileDetails?.department 
    || user?.department 
    || "Engineering & Tech";

  const displayBranch = branchInfo?.branchName 
    || profileDetails?.branch?.name 
    || user?.branch 
    || "Main HQ Office";

  const displayRadius = branchInfo?.geofenceRadius 
    || profileDetails?.geofenceRadius 
    || 120;

  const displayPhone = profileDetails?.phone || user?.phone || "+880 1700-000000";
  const displayJoinDate = profileDetails?.createdAt 
    ? new Date(profileDetails.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "15 Jan 2024";

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B050"]} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#00B050" />
            <Text style={styles.loadingText}>Loading profile data...</Text>
          </View>
        ) : null}

        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName
                .split(" ")
                .filter(Boolean)
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.code}>
            {displayCode} · {displayDesignation}
          </Text>
          <Text style={styles.email}>{displayEmail}</Text>

          <View style={styles.badgeContainer}>
            <View style={[styles.statusPill, !faceData.registered && styles.statusPillPending]}>
              <ShieldCheck size={13} color={faceData.registered ? "#00B050" : "#D97706"} />
              <Text style={[styles.statusPillText, !faceData.registered && styles.statusPillTextPending]}>
                {faceData.registered ? "Face Biometric Active" : "Face Biometric Pending Setup"}
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
            onPress={() => navigation.navigate("FaceRegister")}
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
            <Text style={styles.infoVal}>{displayDepartment}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Building2 size={16} color="#64748B" />
              <Text style={styles.infoLabel}>Branch Office</Text>
            </View>
            <Text style={styles.infoVal}>{displayBranch}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Clock size={16} color="#64748B" />
              <Text style={styles.infoLabel}>Office Shift</Text>
            </View>
            <Text style={styles.infoVal}>{OFFICE_TIMINGS.shiftStart} - {OFFICE_TIMINGS.shiftEnd}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Calendar size={16} color="#64748B" />
              <Text style={styles.infoLabel}>Join Date</Text>
            </View>
            <Text style={styles.infoVal}>{displayJoinDate}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <MapPin size={16} color="#00B050" />
              <Text style={styles.infoLabel}>Geofence Radius</Text>
            </View>
            <Text style={[styles.infoVal, { color: "#00B050", fontWeight: "800" }]}>
              {displayRadius}m Perimeter Active
            </Text>
          </View>
        </View>

        {/* System & Identity Details */}
        <Text style={styles.sectionTitle}>System Identifiers</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <User size={16} color="#64748B" />
              <Text style={styles.infoLabel}>User ID</Text>
            </View>
            <Text style={[styles.infoVal, { fontSize: 11, color: "#64748B" }]}>
              {employeeIdRaw}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <Building2 size={16} color="#64748B" />
              <Text style={styles.infoLabel}>Organization ID</Text>
            </View>
            <Text style={[styles.infoVal, { fontSize: 11, color: "#64748B" }]}>
              {profileDetails?.organizationId || user?.organizationId || "org-1788097016300"}
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
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
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
  statusPillPending: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  statusPillText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },
  statusPillTextPending: {
    color: "#D97706",
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
    marginBottom: 20,
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
    marginTop: 6,
  },
  logoutBtnText: {
    color: "#E11D48",
    fontSize: 14,
    fontWeight: "800",
  },
});