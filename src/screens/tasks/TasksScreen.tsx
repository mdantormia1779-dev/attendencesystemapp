import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Layers,
  TrendingUp,
  AlertTriangle,
  Play,
  Check,
  X,
  FileText,
  User,
} from "lucide-react-native";
import { tasksApi } from "../../api/tasks";
import { TaskItem, TaskPriority, TaskStatus } from "../../types";
import { useAuth } from "../../context/AuthContext";

type FilterTab = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

export default function TasksScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  console.log(tasks);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("ALL");

  // Completion Modal State
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [activeTaskForCompletion, setActiveTaskForCompletion] = useState<TaskItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTasks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await tasksApi.getTasks();
      console.log("Tasks fetch response:", res);
      if (res.success && Array.isArray(res.data)) {
        setTasks(res.data);
      } else if (Array.isArray(res as any)) {
        setTasks(res as any);
      }
    } catch (e) {
      console.warn("Tasks fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchTasks();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    fetchTasks(true);
  }, []);

  // Quick Start Task
  const handleStartTask = async (task: TaskItem) => {
    try {
      setActionLoading(true);
      const res = await tasksApi.updateTask(task.id, { status: "IN_PROGRESS" });
      if (res.success && res.data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "IN_PROGRESS" } : t))
        );
      }
    } catch (e) {
      console.warn("Start task error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Task Completion
  const handleCompleteTask = async () => {
    if (!activeTaskForCompletion) return;
    try {
      setActionLoading(true);
      const res = await tasksApi.updateTask(activeTaskForCompletion.id, {
        status: "COMPLETED",
        completionNotes: completionNotes.trim() || "Completed via Mobile App",
      });
      if (res.success && res.data) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeTaskForCompletion.id
              ? {
                  ...t,
                  status: "COMPLETED",
                  completedAt: new Date().toISOString(),
                  completionNotes: completionNotes.trim() || "Completed via Mobile App",
                }
              : t
          )
        );
        setCompletionModalVisible(false);
        setActiveTaskForCompletion(null);
        setCompletionNotes("");
      }
    } catch (e) {
      console.warn("Complete task error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  // Compute metrics
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    overdue: tasks.filter((t) => t.isOverdue || (t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "COMPLETED" && t.status !== "CANCELLED")).length,
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case "URGENT":
        return { bg: "#FFE4E6", text: "#E11D48", label: "Urgent" };
      case "HIGH":
        return { bg: "#FEF3C7", text: "#D97706", label: "High" };
      case "MEDIUM":
        return { bg: "#EFF6FF", text: "#2563EB", label: "Medium" };
      case "LOW":
      default:
        return { bg: "#F1F5F9", text: "#64748B", label: "Low" };
    }
  };

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case "COMPLETED":
        return { bg: "#ECFDF5", text: "#00B050", label: "Completed" };
      case "IN_PROGRESS":
        return { bg: "#EEF2FF", text: "#4F46E5", label: "In Progress" };
      case "CANCELLED":
        return { bg: "#F1F5F9", text: "#94A3B8", label: "Cancelled" };
      case "PENDING":
      default:
        return { bg: "#FFFBEB", text: "#D97706", label: "Pending" };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>My Tasks & Deliverables</Text>
          <Text style={styles.headerSubtitle}>Manage your assignments & deadlines</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchTasks(true)}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color="#00B050" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B050"]} />}
      >
        {/* KPI Metrics Row */}
        <View style={styles.kpiContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: "#F0FDF4" }]}>
                <Layers size={16} color="#00B050" />
              </View>
              <Text style={styles.kpiValue}>{stats.total}</Text>
              <Text style={styles.kpiLabel}>Total Tasks</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: "#FFFBEB" }]}>
                <Clock size={16} color="#D97706" />
              </View>
              <Text style={[styles.kpiValue, { color: "#D97706" }]}>{stats.pending}</Text>
              <Text style={styles.kpiLabel}>Pending</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: "#EEF2FF" }]}>
                <TrendingUp size={16} color="#4F46E5" />
              </View>
              <Text style={[styles.kpiValue, { color: "#4F46E5" }]}>{stats.inProgress}</Text>
              <Text style={styles.kpiLabel}>In Progress</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: "#ECFDF5" }]}>
                <CheckCircle2 size={16} color="#00B050" />
              </View>
              <Text style={[styles.kpiValue, { color: "#00B050" }]}>{stats.completed}</Text>
              <Text style={styles.kpiLabel}>Completed</Text>
            </View>

            {stats.overdue > 0 && (
              <View style={[styles.kpiCard, { borderColor: "#FECDD3", backgroundColor: "#FFF1F2" }]}>
                <View style={[styles.kpiIconBox, { backgroundColor: "#FFE4E6" }]}>
                  <AlertTriangle size={16} color="#E11D48" />
                </View>
                <Text style={[styles.kpiValue, { color: "#E11D48" }]}>{stats.overdue}</Text>
                <Text style={[styles.kpiLabel, { color: "#BE123C" }]}>Overdue</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"] as FilterTab[]).map((tab) => {
            const isActive = filter === tab;
            let label = "All";
            if (tab === "PENDING") label = `Pending (${stats.pending})`;
            else if (tab === "IN_PROGRESS") label = `In Progress (${stats.inProgress})`;
            else if (tab === "COMPLETED") label = `Done (${stats.completed})`;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Task List */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#00B050" />
              <Text style={styles.loadingText}>Loading assigned tasks...</Text>
            </View>
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <CheckCircle2 size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Tasks Found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === "ALL"
                  ? "You have no assigned tasks at the moment. Enjoy your day!"
                  : `No tasks found under '${filter.toLowerCase()}'.`}
              </Text>
            </View>
          ) : (
            filteredTasks.map((task) => {
              const pStyle = getPriorityStyle(task.priority);
              const sStyle = getStatusStyle(task.status);
              const isOverdue =
                task.isOverdue ||
                (task.dueDate &&
                  new Date(task.dueDate).getTime() < Date.now() &&
                  task.status !== "COMPLETED" &&
                  task.status !== "CANCELLED");

              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("TaskDetails", { taskId: task.id })}
                >
                  {/* Card Top: Badges */}
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: pStyle.bg }]}>
                        <Text style={[styles.badgeText, { color: pStyle.text }]}>{pStyle.label}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: sStyle.bg }]}>
                        <Text style={[styles.badgeText, { color: sStyle.text }]}>{sStyle.label}</Text>
                      </View>
                    </View>

                    {isOverdue && (
                      <View style={styles.overdueBadge}>
                        <AlertTriangle size={11} color="#E11D48" />
                        <Text style={styles.overdueText}>OVERDUE</Text>
                      </View>
                    )}
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.description && (
                    <Text style={styles.taskDesc} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}

                  {/* Metadata Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Calendar size={13} color="#94A3B8" />
                      <Text style={[styles.metaText, isOverdue && { color: "#E11D48", fontWeight: "700" }]}>
                        Due:{" "}
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "No deadline"}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <User size={13} color="#94A3B8" />
                      <Text style={styles.metaText}>By: {task.assignedByName || "Admin"}</Text>
                    </View>
                  </View>

                  {/* Action Bar */}
                  <View style={styles.cardFooter}>
                    {task.status === "PENDING" ? (
                      <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => handleStartTask(task)}
                        disabled={actionLoading}
                        activeOpacity={0.7}
                      >
                        <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.startBtnText}>Start Working</Text>
                      </TouchableOpacity>
                    ) : task.status === "IN_PROGRESS" ? (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => {
                          setActiveTaskForCompletion(task);
                          setCompletionNotes("");
                          setCompletionModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Check size={14} color="#FFFFFF" />
                        <Text style={styles.completeBtnText}>Mark as Done</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.doneIndicator}>
                        <CheckCircle2 size={15} color="#00B050" />
                        <Text style={styles.doneText}>Delivered</Text>
                      </View>
                    )}

                    <View style={styles.detailsBtn}>
                      <Text style={styles.detailsBtnText}>Details</Text>
                      <ChevronRight size={14} color="#94A3B8" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* COMPLETION MODAL */}
      <Modal
        visible={completionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompletionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <CheckCircle2 size={22} color="#00B050" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.modalTitle}>Complete Deliverable</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {activeTaskForCompletion?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCompletionModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Deliverable Feedback / Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Audit reports prepared and attached. Ready for manager review..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={completionNotes}
              onChangeText={setCompletionNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCompletionModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCompleteTask}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Deliverable</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  kpiContainer: {
    marginTop: 14,
  },
  kpiScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  kpiCard: {
    width: 104,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
  },
  kpiIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#00B050",
    borderColor: "#00B050",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  overdueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E11D48",
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#00B050",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  doneIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  doneText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00B050",
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 6,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    textAlignVertical: "top",
    minHeight: 90,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  submitBtn: {
    backgroundColor: "#00B050",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
