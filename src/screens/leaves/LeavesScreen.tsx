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
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react-native";
import { attendanceService, LeaveBalances } from "../../services/attendanceService";
import { LeaveRequest } from "../../types";

export default function LeavesScreen({ navigation }: { navigation: any }) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalances>({
    CASUAL: 6,
    SICK: 8,
    ANNUAL: 14,
    UNPAID: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaves = async () => {
    try {
      const [reqs, bal] = await Promise.all([
        attendanceService.getLeaveRequests(),
        attendanceService.getLeaveBalances(),
      ]);
      setLeaves(reqs);
      setBalances(bal);
    } catch (e) {
      console.log("Leaves fetch notice:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchLeaves();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

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
        <Text style={styles.headerTitle}>Leave Management</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("ApplyLeave")}
          activeOpacity={0.85}
        >
          <Plus size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B050" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quota Summary Cards */}
        <View style={styles.quotaRow}>
          <View style={styles.quotaBox}>
            <Text style={styles.quotaLabel}>Casual</Text>
            <Text style={styles.quotaVal}>{balances.CASUAL} Left</Text>
            <Text style={styles.quotaSub}>of 10 total</Text>
          </View>
          <View style={styles.quotaBox}>
            <Text style={styles.quotaLabel}>Sick</Text>
            <Text style={[styles.quotaVal, { color: "#2563EB" }]}>{balances.SICK} Left</Text>
            <Text style={styles.quotaSub}>of 10 total</Text>
          </View>
          <View style={styles.quotaBox}>
            <Text style={styles.quotaLabel}>Annual</Text>
            <Text style={[styles.quotaVal, { color: "#9333EA" }]}>{balances.ANNUAL} Left</Text>
            <Text style={styles.quotaSub}>of 15 total</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Application Records</Text>

        {loading ? (
          <ActivityIndicator color="#00B050" size="large" style={{ marginTop: 30 }} />
        ) : leaves.length === 0 ? (
          <View style={styles.emptyBox}>
            <Calendar size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Leave Applications</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Apply" button above to submit a new leave request.
            </Text>
          </View>
        ) : (
          leaves.map((leave, idx) => (
            <View key={leave.id || idx} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <View style={styles.leaveHeaderLeft}>
                  <Text style={styles.leaveType}>{leave.leaveType} LEAVE</Text>
                  <Text style={styles.leaveDates}>
                    {leave.startDate} → {leave.endDate} ({leave.daysCount || 1} Days)
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    leave.status === "APPROVED"
                      ? styles.badgeApproved
                      : leave.status === "PENDING"
                      ? styles.badgePending
                      : styles.badgeRejected,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      leave.status === "APPROVED"
                        ? styles.textApproved
                        : leave.status === "PENDING"
                        ? styles.textPending
                        : styles.textRejected,
                    ]}
                  >
                    {leave.status || "PENDING"}
                  </Text>
                </View>
              </View>

              <Text style={styles.reasonText}>"{leave.reason}"</Text>

              {leave.managerComment && (
                <View style={styles.commentBox}>
                  <Text style={styles.commentLabel}>Manager Note:</Text>
                  <Text style={styles.commentText}>{leave.managerComment}</Text>
                </View>
              )}
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00B050",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  quotaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  quotaBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  quotaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  quotaVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#00B050",
    marginTop: 2,
  },
  quotaSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
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
    paddingVertical: 50,
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
    paddingHorizontal: 30,
  },
  leaveCard: {
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
  leaveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  leaveHeaderLeft: {
    flex: 1,
  },
  leaveType: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  leaveDates: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeApproved: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  badgeRejected: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textApproved: {
    color: "#059669",
  },
  textPending: {
    color: "#D97706",
  },
  textRejected: {
    color: "#E11D48",
  },
  reasonText: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 18,
  },
  commentBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  commentLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
  },
  commentText: {
    fontSize: 12,
    color: "#1E293B",
    marginTop: 2,
  },
});
