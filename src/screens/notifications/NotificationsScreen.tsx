import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  CheckSquare,
  AlertTriangle,
  Info,
  CheckCheck,
  Calendar,
  X,
  Sparkles,
  ChevronRight,
  Volume2,
} from "lucide-react-native";
import { notificationsApi, NotificationItem } from "../../api/notifications";
import { playNotificationSound } from "../../services/notificationSoundService";

export default function NotificationsScreen({ navigation }: { navigation: any }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "TASKS">("ALL");
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const fetchNotifications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await notificationsApi.getNotifications();
      const list = res?.data?.notifications || (res as any)?.notifications || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Notifications fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchNotifications();
    });
    return unsubscribe;
  }, [navigation]);

  const handleMarkAsRead = async (item: NotificationItem) => {
    setSelectedNotif(item);
    if (!item.isRead) {
      // Optimistically update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      try {
        await notificationsApi.markAsRead(item.id);
      } catch (err) {
        console.warn("Mark read error:", err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.warn("Mark all read error:", err);
    }
  };

  // Filter list
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "UNREAD") return !n.isRead;
    if (activeTab === "TASKS") {
      return (
        n.title.toLowerCase().includes("task") ||
        n.message.toLowerCase().includes("task")
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  const renderIcon = (item: NotificationItem) => {
    const isTask =
      item.title.toLowerCase().includes("task") ||
      item.message.toLowerCase().includes("task");

    if (isTask) {
      return (
        <View style={[styles.iconBox, { backgroundColor: "#F0FDF4" }]}>
          <CheckSquare size={20} color="#00B050" />
        </View>
      );
    }

    if (item.type === "ALERT" || item.type === "WARNING") {
      return (
        <View style={[styles.iconBox, { backgroundColor: "#FFFBEB" }]}>
          <AlertTriangle size={20} color="#D97706" />
        </View>
      );
    }

    return (
      <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
        <Bell size={20} color="#2563EB" />
      </View>
    );
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
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {unreadCount} unread message{unreadCount > 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            style={[styles.markAllBtn, { backgroundColor: "#EFF6FF" }]}
            onPress={playNotificationSound}
            activeOpacity={0.7}
          >
            <Volume2 size={18} color="#2563EB" />
          </TouchableOpacity>

          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
            >
              <CheckCheck size={18} color="#00B050" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 4 }} />
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ALL" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ALL")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabBtnText, activeTab === "ALL" && styles.tabBtnTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "UNREAD" && styles.tabBtnActive]}
          onPress={() => setActiveTab("UNREAD")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabBtnText, activeTab === "UNREAD" && styles.tabBtnTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "TASKS" && styles.tabBtnActive]}
          onPress={() => setActiveTab("TASKS")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabBtnText, activeTab === "TASKS" && styles.tabBtnTextActive]}>
            Tasks
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#00B050" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Bell size={36} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === "UNREAD"
              ? "You have read all your notifications!"
              : activeTab === "TASKS"
              ? "No task notifications received yet."
              : "When your organization or manager sends an announcement or task, it will appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#00B050"
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isUnread = !item.isRead;
            return (
              <TouchableOpacity
                style={[styles.notifCard, isUnread && styles.notifCardUnread]}
                onPress={() => handleMarkAsRead(item)}
                activeOpacity={0.75}
              >
                {renderIcon(item)}
                <View style={styles.notifBody}>
                  <View style={styles.notifHeaderRow}>
                    <Text style={[styles.notifTitle, isUnread && styles.notifTitleBold]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.notifTime}>{formatTimeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                </View>
                {isUnread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Details Modal */}
      <Modal visible={!!selectedNotif} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {selectedNotif && renderIcon(selectedNotif)}
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedNotif?.title}</Text>
                  <Text style={styles.modalTime}>
                    {selectedNotif ? formatTimeAgo(selectedNotif.createdAt) : ""}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedNotif(null)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <Text style={styles.modalMessage}>{selectedNotif?.message}</Text>

            {selectedNotif?.title?.toLowerCase().includes("task") && (
              <TouchableOpacity
                style={styles.viewTaskBtn}
                onPress={() => {
                  setSelectedNotif(null);
                  navigation.navigate("Tasks");
                }}
                activeOpacity={0.8}
              >
                <CheckSquare size={18} color="#FFFFFF" />
                <Text style={styles.viewTaskBtnText}>View My Tasks</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalOkBtn}
              onPress={() => setSelectedNotif(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalOkBtnText}>Close</Text>
            </TouchableOpacity>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#00B050",
    fontWeight: "500",
    marginTop: 2,
  },
  markAllBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: "#00B050",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: "#F8FCF8",
    borderColor: "#86EFAC",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notifBody: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },
  notifTitleBold: {
    fontWeight: "700",
    color: "#0F172A",
  },
  notifTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  notifMessage: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00B050",
    marginTop: 6,
    marginLeft: 6,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalTime: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  modalMessage: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 20,
  },
  viewTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00B050",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  viewTaskBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOkBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 12,
  },
  modalOkBtnText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
});
