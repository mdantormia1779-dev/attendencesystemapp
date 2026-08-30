import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Flame,
} from "lucide-react-native";
import { attendanceService, OFFICE_TIMINGS } from "../../services/attendanceService";
import { AttendancePunch } from "../../types";

export default function AttendanceHistoryScreen({ navigation }: { navigation: any }) {
  const [logs, setLogs] = useState<AttendancePunch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await attendanceService.getAttendanceHistory();
      setLogs(data);
    } catch (e) {
      console.log("Attendance history error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchHistory();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const presentCount = logs.filter((l) => l.status === "PRESENT").length;
  const lateCount = logs.filter((l) => l.status === "LATE").length;
  const totalOT = logs.reduce((sum, l) => sum + (l.overtimeHours || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B050" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Month Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.shiftHeaderRow}>
            <Text style={styles.shiftHeaderTitle}>Standard Shift: {OFFICE_TIMINGS.shiftStart} - {OFFICE_TIMINGS.shiftEnd}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{presentCount}</Text>
              <Text style={styles.summaryLabel}>On-Time</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: "#D97706" }]}>{lateCount}</Text>
              <Text style={styles.summaryLabel}>Late Punches</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: "#00B050" }]}>+{totalOT.toFixed(1)}h</Text>
              <Text style={styles.summaryLabel}>Overtime</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Punch Records Timeline</Text>

        {loading ? (
          <ActivityIndicator color="#00B050" size="large" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Calendar size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Attendance Records Yet</Text>
            <Text style={styles.emptySubtitle}>
              Punch your check-in from the home screen to build your work history.
            </Text>
          </View>
        ) : (
          logs.map((log, idx) => (
            <View key={log.id || idx} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logHeaderLeft}>
                  <Text style={styles.logDate}>{log.date || "Recent Date"}</Text>
                  <View style={styles.locTag}>
                    <MapPin size={11} color="#64748B" />
                    <Text style={styles.logLocation}>Office HQ (Geofence Verified)</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    log.status === "PRESENT" ? styles.badgePresent : styles.badgeLate,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      log.status === "PRESENT" ? styles.textPresent : styles.textLate,
                    ]}
                  >
                    {log.status || "PRESENT"}
                  </Text>
                </View>
              </View>

              <View style={styles.timesRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>In Time</Text>
                  <Text style={styles.timeVal}>{log.checkInTime || "--:--"}</Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Out Time</Text>
                  <Text style={styles.timeVal}>{log.checkOutTime || "--:--"}</Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Overtime</Text>
                  <Text style={[styles.timeVal, { color: log.overtimeHours ? "#00B050" : "#64748B" }]}>
                    {log.overtimeHours ? `+${log.overtimeHours}h` : "0h"}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
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
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  shiftHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  shiftHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00B050",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 40,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logHeaderLeft: {
    flex: 1,
  },
  logDate: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  locTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  logLocation: {
    fontSize: 11,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePresent: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  badgeLate: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textPresent: {
    color: "#059669",
  },
  textLate: {
    color: "#D97706",
  },
  timesRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  timeBox: {
    flex: 1,
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timeVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
});
