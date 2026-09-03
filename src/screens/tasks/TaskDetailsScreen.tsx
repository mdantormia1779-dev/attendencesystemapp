import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  User,
  Building2,
  FileText,
  Play,
  Check,
  Share2,
} from "lucide-react-native";
import { tasksApi } from "../../api/tasks";
import { TaskItem, TaskPriority, TaskStatus } from "../../types";

export default function TaskDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const { taskId } = route.params || {};
  const [task, setTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const res = await tasksApi.getTaskById(taskId);
      if (res.success && res.data) {
        setTask(res.data);
        setCompletionNotes(res.data.completionNotes || "");
      }
    } catch (e) {
      console.warn("Task details fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  const handleUpdateStatus = async (newStatus: TaskStatus, notes?: string) => {
    if (!task) return;
    try {
      setActionLoading(true);
      const res = await tasksApi.updateTask(task.id, {
        status: newStatus,
        completionNotes: notes !== undefined ? notes : completionNotes,
      });
      if (res.success && res.data) {
        setTask(res.data);
        setIsEditingNotes(false);
        Alert.alert("Success", `Task status updated to ${newStatus}`);
      }
    } catch (e) {
      console.warn("Update status error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityStyle = (priority?: TaskPriority) => {
    switch (priority) {
      case "URGENT":
        return { bg: "#FFE4E6", text: "#E11D48", label: "Urgent Priority" };
      case "HIGH":
        return { bg: "#FEF3C7", text: "#D97706", label: "High Priority" };
      case "MEDIUM":
        return { bg: "#EFF6FF", text: "#2563EB", label: "Medium Priority" };
      case "LOW":
      default:
        return { bg: "#F1F5F9", text: "#64748B", label: "Low Priority" };
    }
  };

  const getStatusStyle = (status?: TaskStatus) => {
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#00B050" />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <AlertCircle size={40} color="#94A3B8" />
        <Text style={styles.notFoundTitle}>Task Not Found</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pStyle = getPriorityStyle(task.priority);
  const sStyle = getStatusStyle(task.status);
  const isOverdue =
    task.isOverdue ||
    (task.dueDate &&
      new Date(task.dueDate).getTime() < Date.now() &&
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED");

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
        <Text style={styles.headerTitle}>Deliverable Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status & Priority Ribbon */}
        <View style={styles.ribbonRow}>
          <View style={[styles.pillBadge, { backgroundColor: pStyle.bg }]}>
            <Text style={[styles.pillText, { color: pStyle.text }]}>{pStyle.label}</Text>
          </View>
          <View style={[styles.pillBadge, { backgroundColor: sStyle.bg }]}>
            <Text style={[styles.pillText, { color: sStyle.text }]}>{sStyle.label}</Text>
          </View>
          {isOverdue && (
            <View style={[styles.pillBadge, { backgroundColor: "#FFE4E6" }]}>
              <AlertTriangle size={11} color="#E11D48" />
              <Text style={[styles.pillText, { color: "#E11D48", marginLeft: 3 }]}>OVERDUE</Text>
            </View>
          )}
        </View>

        {/* Task Title */}
        <Text style={styles.title}>{task.title}</Text>

        {/* Deliverable Description Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <FileText size={18} color="#00B050" />
            <Text style={styles.cardTitle}>Deliverable Scope & Criteria</Text>
          </View>
          <Text style={styles.descText}>
            {task.description || "No specific instructions provided for this task."}
          </Text>
        </View>

        {/* People & Department Info */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <User size={18} color="#2563EB" />
            <Text style={styles.cardTitle}>Assignment Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned By:</Text>
            <Text style={styles.infoVal}>
              {task.assignedByName} ({task.assignedByRole === "ORG_ADMIN" ? "Admin" : "Manager"})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned To:</Text>
            <Text style={styles.infoVal}>
              {task.employeeName} ({task.employeeCode})
            </Text>
          </View>

          {task.departmentName && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Department:</Text>
              <Text style={styles.infoVal}>{task.departmentName}</Text>
            </View>
          )}
        </View>

        {/* Timeline Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Calendar size={18} color="#D97706" />
            <Text style={styles.cardTitle}>Deadlines & Timeline</Text>
          </View>

          <View style={styles.timelineRow}>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Assigned Date</Text>
              <Text style={styles.timelineVal}>
                {new Date(task.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>

            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Target Deadline</Text>
              <Text
                style={[
                  styles.timelineVal,
                  isOverdue && { color: "#E11D48", fontWeight: "800" },
                ]}
              >
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No deadline"}
              </Text>
            </View>
          </View>

          {task.completedAt && (
            <View style={styles.completedBanner}>
              <CheckCircle2 size={16} color="#00B050" />
              <Text style={styles.completedBannerText}>
                Finished on {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          )}
        </View>

        {/* Completion Notes Section */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <CheckCircle2 size={18} color="#00B050" />
            <Text style={styles.cardTitle}>Deliverable Feedback / Notes</Text>
          </View>

          {isEditingNotes ? (
            <View>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="Enter completion notes, deliverable links or comments..."
                placeholderTextColor="#94A3B8"
                value={completionNotes}
                onChangeText={setCompletionNotes}
              />
              <View style={styles.notesActions}>
                <TouchableOpacity
                  style={styles.cancelNoteBtn}
                  onPress={() => setIsEditingNotes(false)}
                >
                  <Text style={styles.cancelNoteText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveNoteBtn}
                  onPress={() => handleUpdateStatus(task.status, completionNotes)}
                  disabled={actionLoading}
                >
                  <Text style={styles.saveNoteText}>Save Notes</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.notesDisplayText}>
                {task.completionNotes || "No feedback notes recorded yet."}
              </Text>
              <TouchableOpacity
                style={styles.editNoteBtn}
                onPress={() => setIsEditingNotes(true)}
              >
                <Text style={styles.editNoteBtnText}>
                  {task.completionNotes ? "Edit Notes" : "+ Add Deliverable Notes"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Status Buttons */}
        <View style={styles.bottomActions}>
          {task.status === "PENDING" && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => handleUpdateStatus("IN_PROGRESS")}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Start Working</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {task.status === "IN_PROGRESS" && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: "#00B050" }]}
              onPress={() => handleUpdateStatus("COMPLETED")}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.primaryActionBtnText}>Mark as Completed</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {task.status === "COMPLETED" && (
            <View style={styles.finishedCard}>
              <CheckCircle2 size={24} color="#00B050" />
              <Text style={styles.finishedTitle}>Task Successfully Delivered</Text>
              <Text style={styles.finishedSub}>
                Verified and marked done. Keep up the great work!
              </Text>
            </View>
          )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  ribbonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 28,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  descText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  infoVal: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  timelineItem: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
  },
  timelineLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
  },
  timelineVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  completedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00B050",
  },
  notesDisplayText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
  },
  editNoteBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  editNoteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00B050",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    textAlignVertical: "top",
    minHeight: 80,
  },
  notesActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  cancelNoteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelNoteText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  saveNoteBtn: {
    backgroundColor: "#00B050",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveNoteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomActions: {
    marginTop: 10,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  finishedCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  finishedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00B050",
    marginTop: 8,
  },
  finishedSub: {
    fontSize: 12,
    color: "#166534",
    marginTop: 2,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
    fontWeight: "600",
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  goBackBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#00B050",
    borderRadius: 10,
  },
  goBackBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
