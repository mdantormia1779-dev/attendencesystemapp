import React, { useState, useEffect, useCallback } from "react";
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
  FileText,
  Sparkles,
  PieChart,
  ChevronRight,
} from "lucide-react-native";
import { attendanceService } from "../../services/attendanceService";
import { LeaveRequest, LeaveStats } from "../../types";

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function LeavesScreen({ navigation }: { navigation: any }) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats>({
    CASUAL: { total: 10, used: 0, pending: 0, remaining: 10 },
    SICK: { total: 10, used: 0, pending: 0, remaining: 10 },
    ANNUAL: { total: 15, used: 0, pending: 0, remaining: 15 },
    UNPAID: { total: 0, used: 0, pending: 0, remaining: 0 },
    totalApprovedDays: 0,
    totalPendingDays: 0,
    totalRemainingDays: 35,
  });

  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaveData = async () => {
    try {
      const [reqs, leaveStats] = await Promise.all([
        attendanceService.getLeaveRequests(),
        attendanceService.getLeaveStats(),
      ]);
      setLeaves(reqs);
      setStats(leaveStats);
    } catch (e) {
      console.log("Leaves fetch notice:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchLeaveData();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaveData();
  }, []);

  // Filter leaves based on active tab
  const filteredLeaves = leaves.filter((l) => {
    if (selectedFilter === "ALL") return true;
    return (l.status || "").toUpperCase() === selectedFilter;
  });

  const pendingCount = leaves.filter((l) => (l.status || "").toUpperCase() === "PENDING").length;
  const approvedCount = leaves.filter((l) => (l.status || "").toUpperCase() === "APPROVED").length;
  const rejectedCount = leaves.filter((l) => (l.status || "").toUpperCase() === "REJECTED").length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Leave Management</Text>
          <Text style={styles.headerSubtitle}>Leave Balance & Records</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("ApplyLeave")}
          activeOpacity={0.85}
        >
          <Plus size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B050" />
          <Text style={styles.loadingText}>Loading leave details...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00B050"
              colors={["#00B050"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Top Summary Overview */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Remaining Quota</Text>
              <Text style={[styles.overviewVal, { color: "#00B050" }]}>
                {stats.totalRemainingDays} <Text style={styles.unitText}>Days</Text>
              </Text>
              <Text style={styles.overviewSub}>Total 35 days quota</Text>
            </View>

            <View style={styles.overviewDivider} />

            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Pending Approval</Text>
              <Text style={[styles.overviewVal, { color: "#D97706" }]}>
                {stats.totalPendingDays} <Text style={styles.unitText}>Days</Text>
              </Text>
              <Text style={styles.overviewSub}>{pendingCount} Requests</Text>
            </View>

            <View style={styles.overviewDivider} />

            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Leaves Taken</Text>
              <Text style={[styles.overviewVal, { color: "#0284C7" }]}>
                {stats.totalApprovedDays} <Text style={styles.unitText}>Days</Text>
              </Text>
              <Text style={styles.overviewSub}>Approved</Text>
            </View>
          </View>

          {/* Category Quota Breakdown */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quota by Category</Text>
          </View>

          <View style={styles.quotaRow}>
            {/* Casual Leave */}
            <View style={[styles.quotaBox, { borderColor: "#BBF7D0" }]}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaLabel}>Casual</Text>
                <View style={[styles.quotaDot, { backgroundColor: "#00B050" }]} />
              </View>
              <Text style={styles.quotaVal}>
                {stats.CASUAL.remaining}{" "}
                <Text style={styles.quotaTotal}>/ {stats.CASUAL.total} Days</Text>
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: "#00B050",
                      width: `${Math.min(100, (stats.CASUAL.remaining / stats.CASUAL.total) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.quotaSub}>
                {stats.CASUAL.used} used
                {stats.CASUAL.pending > 0 ? ` • ${stats.CASUAL.pending} pending` : ""}
              </Text>
            </View>

            {/* Sick Leave */}
            <View style={[styles.quotaBox, { borderColor: "#BFDBFE" }]}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaLabel}>Sick</Text>
                <View style={[styles.quotaDot, { backgroundColor: "#2563EB" }]} />
              </View>
              <Text style={[styles.quotaVal, { color: "#2563EB" }]}>
                {stats.SICK.remaining}{" "}
                <Text style={styles.quotaTotal}>/ {stats.SICK.total} Days</Text>
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: "#2563EB",
                      width: `${Math.min(100, (stats.SICK.remaining / stats.SICK.total) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.quotaSub}>
                {stats.SICK.used} used
                {stats.SICK.pending > 0 ? ` • ${stats.SICK.pending} pending` : ""}
              </Text>
            </View>

            {/* Annual Leave */}
            <View style={[styles.quotaBox, { borderColor: "#E9D5FF" }]}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaLabel}>Annual</Text>
                <View style={[styles.quotaDot, { backgroundColor: "#9333EA" }]} />
              </View>
              <Text style={[styles.quotaVal, { color: "#9333EA" }]}>
                {stats.ANNUAL.remaining}{" "}
                <Text style={styles.quotaTotal}>/ {stats.ANNUAL.total} Days</Text>
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: "#9333EA",
                      width: `${Math.min(100, (stats.ANNUAL.remaining / stats.ANNUAL.total) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.quotaSub}>
                {stats.ANNUAL.used} used
                {stats.ANNUAL.pending > 0 ? ` • ${stats.ANNUAL.pending} pending` : ""}
              </Text>
            </View>
          </View>

          {/* Section: Application History */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Leave Applications</Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === "ALL" && styles.filterChipActive]}
              onPress={() => setSelectedFilter("ALL")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "ALL" && styles.filterChipTextActive,
                ]}
              >
                All ({leaves.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === "PENDING" && styles.filterChipActive]}
              onPress={() => setSelectedFilter("PENDING")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "PENDING" && styles.filterChipTextActive,
                ]}
              >
                Pending ({pendingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === "APPROVED" && styles.filterChipActive]}
              onPress={() => setSelectedFilter("APPROVED")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "APPROVED" && styles.filterChipTextActive,
                ]}
              >
                Approved ({approvedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === "REJECTED" && styles.filterChipActive]}
              onPress={() => setSelectedFilter("REJECTED")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "REJECTED" && styles.filterChipTextActive,
                ]}
              >
                Rejected ({rejectedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Application Records List */}
          {filteredLeaves.length === 0 ? (
            <View style={styles.emptyBox}>
              <Calendar size={42} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {selectedFilter === "ALL"
                  ? "No Leave Applications Found"
                  : `No ${selectedFilter.toLowerCase()} applications`}
              </Text>
              <Text style={styles.emptySubtitle}>
                Tap the "+ Apply" button above to submit a new leave request.
              </Text>
            </View>
          ) : (
            filteredLeaves.map((leave, idx) => {
              const status = (leave.status || "PENDING").toUpperCase();
              const isApproved = status === "APPROVED";
              const isPending = status === "PENDING";
              const isRejected = status === "REJECTED";

              return (
                <View key={leave.id || idx} style={styles.leaveCard}>
                  <View style={styles.leaveHeader}>
                    <View style={styles.leaveHeaderLeft}>
                      <View style={styles.typeBadgeRow}>
                        <Text style={styles.leaveType}>{leave.leaveType} LEAVE</Text>
                        <Text style={styles.daysPill}>{leave.daysCount || 1} Days</Text>
                      </View>
                      <Text style={styles.leaveDates}>
                        {leave.startDate} → {leave.endDate}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isApproved
                          ? styles.badgeApproved
                          : isPending
                          ? styles.badgePending
                          : styles.badgeRejected,
                      ]}
                    >
                      {isApproved ? (
                        <CheckCircle2 size={12} color="#059669" style={{ marginRight: 4 }} />
                      ) : isPending ? (
                        <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                      ) : (
                        <XCircle size={12} color="#E11D48" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.statusText,
                          isApproved
                            ? styles.textApproved
                            : isPending
                            ? styles.textPending
                            : styles.textRejected,
                        ]}
                      >
                        {isApproved ? "Approved" : isPending ? "Pending" : "Rejected"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reasonText}>"{leave.reason}"</Text>

                  {leave.managerComment ? (
                    <View style={styles.commentBox}>
                      <Text style={styles.commentLabel}>Manager Note:</Text>
                      <Text style={styles.commentText}>{leave.managerComment}</Text>
                    </View>
                  ) : null}

                  {leave.createdAt ? (
                    <Text style={styles.submissionDate}>Applied on: {leave.createdAt}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#00B050",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00B050",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Overview Summary Card
  overviewCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewDivider: {
    width: 1,
    height: "75%",
    backgroundColor: "#F1F5F9",
    alignSelf: "center",
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  overviewVal: {
    fontSize: 20,
    fontWeight: "900",
  },
  unitText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  overviewSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "600",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Quota Grid
  quotaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  quotaBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 13,
    borderWidth: 1.5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quotaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  quotaLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  quotaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quotaVal: {
    fontSize: 17,
    fontWeight: "900",
    color: "#00B050",
    marginBottom: 6,
  },
  quotaTotal: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  quotaSub: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
  },

  // Filter Tabs
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },

  // Empty Box
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 45,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 28,
    lineHeight: 16,
  },

  // Leave Cards
  leaveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  leaveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  leaveHeaderLeft: {
    flex: 1,
  },
  typeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  leaveType: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  daysPill: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leaveDates: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 12,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 18,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  commentBox: {
    padding: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 6,
  },
  commentLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00B050",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 11,
    color: "#1E293B",
    fontWeight: "600",
  },
  submissionDate: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textAlign: "right",
  },
});
