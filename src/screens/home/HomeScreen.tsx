import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  Calendar,
  DollarSign,
  Gift,
  Clock,
  UserCheck,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  QrCode,
  MapPin,
  Flame,
  Fingerprint,
  CheckSquare,
  Bell,
  X,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { attendanceService, OFFICE_TIMINGS, TodayPunchState, RegisteredFaceData } from "../../services/attendanceService";
import { branchApi, BranchLocationData } from "../../api/branch";
import { tasksApi } from "../../api/tasks";
import { notificationsApi, NotificationItem } from "../../api/notifications";
import { playNotificationSound } from "../../services/notificationSoundService";

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [todayPunch, setTodayPunch] = useState<TodayPunchState | null>(null);
  const [faceData, setFaceData] = useState<RegisteredFaceData>({ registered: false });
  const [branchData, setBranchData] = useState<BranchLocationData | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [incomingAlert, setIncomingAlert] = useState<NotificationItem | null>(null);
  const lastNotifIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const [punch, face, branchRes, tasksRes, notifsRes] = await Promise.all([
        attendanceService.getTodayPunch(),
        attendanceService.getRegisteredFace(),
        branchApi.getBranchLocation().catch(() => null),
        tasksApi.getTasks().catch(() => null),
        notificationsApi.getNotifications().catch(() => null),
      ]);
      setTodayPunch(punch);
      setFaceData(face);
      if (branchRes?.success && branchRes?.data) {
        setBranchData(branchRes.data);
      }
      if (tasksRes?.success && Array.isArray(tasksRes?.data)) {
        const active = tasksRes.data.filter((t: any) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
        setPendingTasksCount(active);
      }
      if (notifsRes?.data?.notifications && Array.isArray(notifsRes.data.notifications)) {
        const notifs = notifsRes.data.notifications;
        const unread = notifs.filter((n: any) => !n.isRead).length;
        setUnreadNotifsCount(unread);

        if (notifs.length > 0) {
          const latest = notifs[0];
          if (lastNotifIdRef.current && lastNotifIdRef.current !== latest.id && !latest.isRead) {
            playNotificationSound();
            setIncomingAlert(latest);
            setTimeout(() => setIncomingAlert(null), 6000);
          }
          lastNotifIdRef.current = latest.id;
        }
      } else if (notifsRes?.data?.unreadCount !== undefined) {
        setUnreadNotifsCount(notifsRes.data.unreadCount);
      }
    } catch (e) {
      console.log("Home data fetch:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  // Live polling for instant admin notices & task sound chime
  useEffect(() => {
    const pollTimer = setInterval(async () => {
      try {
        const res = await notificationsApi.getNotifications().catch(() => null);
        const list = res?.data?.notifications;
        if (Array.isArray(list) && list.length > 0) {
          const unread = list.filter((n: any) => !n.isRead).length;
          setUnreadNotifsCount(unread);

          const latest = list[0];
          if (lastNotifIdRef.current && lastNotifIdRef.current !== latest.id && !latest.isRead) {
            playNotificationSound();
            setIncomingAlert(latest);
            setTimeout(() => setIncomingAlert(null), 6000);
          }
          lastNotifIdRef.current = latest.id;
        }
      } catch {}
    }, 12000);

    return () => clearInterval(pollTimer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isCheckedIn = todayPunch?.hasPunchedIn || false;
  const isCheckedOut = todayPunch?.hasPunchedOut || false;

  const currentBranchName = branchData?.branchName || user?.branch || "Office";

  return (
    <SafeAreaView style={styles.container}>
      {/* Real-time Notification Banner with Sound Chime */}
      {incomingAlert && (
        <TouchableOpacity
          style={styles.floatingAlertBanner}
          onPress={() => {
            setIncomingAlert(null);
            navigation.navigate("Notifications");
          }}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.alertIconBox,
              incomingAlert.title.toLowerCase().includes("task")
                ? { backgroundColor: "#F0FDF4" }
                : { backgroundColor: "#EFF6FF" },
            ]}
          >
            {incomingAlert.title.toLowerCase().includes("task") ? (
              <CheckSquare size={18} color="#00B050" />
            ) : (
              <Bell size={18} color="#2563EB" />
            )}
          </View>
          <View style={styles.alertTextBox}>
            <Text style={styles.alertTitle} numberOfLines={1}>
              {incomingAlert.title}
            </Text>
            <Text style={styles.alertMsg} numberOfLines={1}>
              {incomingAlert.message}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIncomingAlert(null)}
            style={styles.alertCloseBtn}
            activeOpacity={0.7}
          >
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B050" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Profile Header */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <Text style={styles.dateLabel}>{currentDate}</Text>
            <Text style={styles.greeting}>
              Hello, {user?.fullName?.split(" ")[0] || "Employee"} 👋
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.tagPill}>
                <Briefcase size={11} color="#00B050" />
                <Text style={styles.tagPillText}>{user?.designation || "Staff"}</Text>
              </View>
              <View style={[styles.tagPill, { backgroundColor: "#F1F5F9" }]}>
                <MapPin size={11} color="#64748B" />
                <Text style={[styles.tagPillText, { color: "#64748B" }]}>
                  {currentBranchName}
                </Text>
              </View>
            </View>
          </View>


          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate("Notifications")}
              activeOpacity={0.8}
            >
              <Bell size={20} color="#0F172A" />
              {unreadNotifsCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileBadge}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.profileInitials}>
                {(user?.fullName || "EM").substring(0, 2).toUpperCase()}
              </Text>
              {faceData.registered && (
                <View style={styles.faceStatusDot}>
                  <Sparkles size={8} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Office Shift Timing Banner */}
        <View style={styles.shiftBanner}>
          <View style={styles.shiftBannerLeft}>
            <Clock size={16} color="#00B050" />
            <Text style={styles.shiftBannerTitle}>
              {(user as any)?.shiftName ? `${(user as any).shiftName}:` : "Official Shift Time:"}
            </Text>
            <Text style={styles.shiftBannerTime}>
              {(user as any)?.shift || ((user as any)?.shiftStart ? `${(user as any).shiftStart} - ${(user as any).shiftEnd}` : `${OFFICE_TIMINGS.shiftStart} - ${OFFICE_TIMINGS.shiftEnd}`)}
            </Text>
          </View>
          <View style={styles.gracePill}>
            <Text style={styles.gracePillText}>
              {(user as any)?.shiftGracePeriod ? `${(user as any).shiftGracePeriod}m Grace` : "15m Grace"}
            </Text>
          </View>
        </View>


        {/* Live Clock & Punch Card */}
        <View style={styles.punchCard}>
          <View style={styles.punchHeader}>
            <View>
              <Text style={styles.liveClock}>{currentTime}</Text>
              <Text style={styles.punchStatusSubtitle}>
                {isCheckedOut
                  ? `Daily shift completed (${todayPunch?.workedHours || 0} hrs)`
                  : isCheckedIn
                  ? "Shift active · In progress"
                  : "Ready for biometric check-in"}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                isCheckedOut
                  ? styles.badgeBlue
                  : isCheckedIn
                  ? styles.badgeGreen
                  : styles.badgeGray,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isCheckedOut
                    ? styles.textBlue
                    : isCheckedIn
                    ? styles.textGreen
                    : styles.textGray,
                ]}
              >
                {isCheckedOut
                  ? "COMPLETED"
                  : isCheckedIn
                  ? todayPunch?.status || "PRESENT"
                  : "NOT PUNCHED"}
              </Text>
            </View>
          </View>

          {/* Timestamps Row */}
          <View style={styles.punchTimesRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Check-In Time</Text>
              <Text style={styles.timeValue}>{todayPunch?.checkInTime || "--:--"}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Check-Out Time</Text>
              <Text style={styles.timeValue}>{todayPunch?.checkOutTime || "--:--"}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Overtime</Text>
              <Text style={[styles.timeValue, { color: todayPunch?.overtimeHours ? "#00B050" : "#64748B" }]}>
                {todayPunch?.overtimeHours ? `+${todayPunch.overtimeHours}h` : "0h"}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          {/* Multi-Method Punch Action Buttons */}
          <TouchableOpacity
            style={[
              styles.punchBtn,
              isCheckedIn && !isCheckedOut
                ? styles.btnCheckout
                : isCheckedOut
                ? [styles.btnCheckin, { backgroundColor: "#0F172A" }]
                : styles.btnCheckin,
            ]}
            onPress={() => navigation.navigate("CheckIn", { mode: faceData.registered ? "FACE" : "FINGERPRINT" })}
            activeOpacity={0.85}
          >
            {faceData.registered ? (
              <Camera size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Fingerprint size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.punchBtnText}>
              {isCheckedIn && !isCheckedOut
                ? "Punch Check-Out"
                : isCheckedOut
                ? "Shift Completed · View Status"
                : faceData.registered
                ? "Face ID / Biometric Check-In"
                : "Fingerprint / GPS Check-In"}
            </Text>
          </TouchableOpacity>

          {/* Quick Biometric Selectors Row */}
          <View style={styles.quickMethodsRow}>
            <TouchableOpacity
              style={styles.quickMethodBtn}
              onPress={() => navigation.navigate("CheckIn", { mode: "FACE" })}
              activeOpacity={0.7}
            >
              <Camera size={16} color="#00B050" />
              <Text style={styles.quickMethodText}>Face AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickMethodBtn}
              onPress={() => navigation.navigate("CheckIn", { mode: "FINGERPRINT" })}
              activeOpacity={0.7}
            >
              <Fingerprint size={16} color="#00B050" />
              <Text style={styles.quickMethodText}>Fingerprint</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickMethodBtn}
              onPress={() => navigation.navigate("CheckIn")}
              activeOpacity={0.7}
            >
              <MapPin size={16} color="#00B050" />
              <Text style={styles.quickMethodText}>Office GPS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Biometric Face Status / Quick Setup Card */}
        {!faceData.registered ? (
          <TouchableOpacity
            style={styles.faceSetupBanner}
            onPress={() => navigation.navigate("FaceRegistration")}
            activeOpacity={0.85}
          >
            <View style={styles.faceSetupIconBox}>
              <Sparkles size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={styles.faceSetupTitle}>Enroll Face Biometrics</Text>
              <Text style={styles.faceSetupSub}>
                Setup 3D neural face profile for 1-second touchless check-in
              </Text>
            </View>
            <View style={styles.faceSetupBtnPill}>
              <Text style={styles.faceSetupBtnPillText}>Setup</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.faceActiveBanner}>
            <View style={styles.faceActiveIconBox}>
              <ShieldCheck size={18} color="#00B050" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={styles.faceActiveTitle}>Face Biometrics Active</Text>
              <Text style={styles.faceActiveSub}>ArcFace 128D neural vector registered & ready</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("FaceRegistration")}
              activeOpacity={0.7}
            >
              <Text style={styles.faceReEnrollText}>Update</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Digital ID Card */}
        <View style={styles.idQuickCard}>
          <View style={styles.idQuickLeft}>
            <View style={styles.idIconBox}>
              <QrCode size={22} color="#00B050" />
            </View>
            <View>
              <Text style={styles.idQuickTitle}>Digital Employee ID</Text>
              <Text style={styles.idQuickSub}>
                Official Active Digital Card
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.idQuickBtn}
            onPress={() => navigation.navigate("IDCard")}
            activeOpacity={0.8}
          >
            <Text style={styles.idQuickBtnText}>View Card</Text>
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview & Metrics</Text>
          <Text style={styles.sectionMonth}>This Month</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "#ECFDF5" }]}>
              <TrendingUp size={18} color="#00B050" />
            </View>
            <Text style={styles.statLabel}>Attendance Rate</Text>
            <Text style={[styles.statValue, { color: "#00B050" }]}>98.5%</Text>
            <Text style={styles.statHint}>22 / 23 Days On-Time</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "#FEF3C7" }]}>
              <Calendar size={18} color="#D97706" />
            </View>
            <Text style={styles.statLabel}>Leave Balance</Text>
            <Text style={[styles.statValue, { color: "#D97706" }]}>14 Days</Text>
            <Text style={styles.statHint}>Available to apply</Text>
          </View>
        </View>

        {/* Quick Menu Section */}
        <Text style={styles.sectionTitle}>Employee Services</Text>
        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Bell size={20} color="#2563EB" />
            </View>
            <View style={styles.menuTextCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.menuTitle}>Announcements & Notices</Text>
                {unreadNotifsCount > 0 && (
                  <View style={[styles.taskBadge, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                    <Text style={[styles.taskBadgeText, { color: "#2563EB" }]}>{unreadNotifsCount} New</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuSubtitle}>Organization updates, alerts & messages</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Tasks")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#F0FDF4" }]}>
              <CheckSquare size={20} color="#00B050" />
            </View>
            <View style={styles.menuTextCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.menuTitle}>My Tasks & Deliverables</Text>
                {pendingTasksCount > 0 && (
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{pendingTasksCount} Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuSubtitle}>Assigned tasks, deadlines & status updates</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("AttendanceTab")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#F0FDF4" }]}>
              <Calendar size={20} color="#00B050" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Attendance History</Text>
              <Text style={styles.menuSubtitle}>Detailed punch timeline & shift hours</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("LeavesTab")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#EFF6FF" }]}>
              <UserCheck size={20} color="#2563EB" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Leave Management</Text>
              <Text style={styles.menuSubtitle}>Apply for leave & view approval status</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("SalaryTab")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#FAF5FF" }]}>
              <DollarSign size={20} color="#9333EA" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Salary & Payslips</Text>
              <Text style={styles.menuSubtitle}>Earnings, allowances & overtime pay</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate("Referrals")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: "#FFF7ED" }]}>
              <Gift size={20} color="#EA580C" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Refer & Earn 20%</Text>
              <Text style={styles.menuSubtitle}>Affiliate earnings & rewards wallet</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  floatingAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#00B050",
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  alertTextBox: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  alertMsg: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  alertCloseBtn: {
    padding: 6,
    marginLeft: 6,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  topHeaderLeft: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00B050",
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  profileBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#00B050",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  profileInitials: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 17,
  },
  faceStatusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#059669",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  shiftBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
  },
  shiftBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shiftBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  shiftBannerTime: {
    fontSize: 12,
    fontWeight: "900",
    color: "#00B050",
  },
  gracePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gracePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  punchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  punchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  liveClock: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  punchStatusSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeGreen: {
    backgroundColor: "#ECFDF5",
  },
  badgeBlue: {
    backgroundColor: "#EFF6FF",
  },
  badgeGray: {
    backgroundColor: "#F1F5F9",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  textGreen: {
    color: "#00B050",
  },
  textBlue: {
    color: "#2563EB",
  },
  textGray: {
    color: "#94A3B8",
  },
  punchTimesRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  timeBox: {
    flex: 1,
    alignItems: "center",
  },
  timeDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  punchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnCheckin: {
    backgroundColor: "#00B050",
    shadowColor: "#00B050",
  },
  btnCheckout: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
  },
  punchBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  quickMethodsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  quickMethodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickMethodText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  faceSetupBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
  },
  faceSetupIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  faceSetupTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  faceSetupSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },
  faceSetupBtnPill: {
    backgroundColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  faceSetupBtnPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  faceActiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
  },
  faceActiveIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  faceActiveTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  faceActiveSub: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 1,
  },
  faceReEnrollText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00B050",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  idQuickCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  idQuickLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  idIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  idQuickTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  idQuickSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  idQuickBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  idQuickBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  sectionMonth: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },
  statHint: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  menuList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  menuSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  taskBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00B050",
  },
});
