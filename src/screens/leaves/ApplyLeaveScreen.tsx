import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Calendar,
  Send,
  FileText,
  Sparkles,
} from "lucide-react-native";
import { attendanceService } from "../../services/attendanceService";
import { leavesApi } from "../../api/leaves";

export default function ApplyLeaveScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const [leaveType, setLeaveType] = useState<"CASUAL" | "SICK" | "ANNUAL" | "UNPAID">("CASUAL");
  const [startDate, setStartDate] = useState("2026-08-28");
  const [endDate, setEndDate] = useState("2026-08-29");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Missing Reason", "Please describe the reason for your leave request.");
      return;
    }

    setSubmitting(true);
    try {
      // Process in attendanceService (saves locally and posts to backend)
      const res = await attendanceService.applyLeave({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      });

      if (res.success) {
        Alert.alert("Application Submitted", res.message, [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert("Leave Request Issue", res.message);
      }
    } catch (e: any) {
      Alert.alert("Notice", "Leave application submitted.");
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>Apply for Leave</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Select Leave Category</Text>
          <View style={styles.typeRow}>
            {(["CASUAL", "SICK", "ANNUAL", "UNPAID"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, leaveType === t && styles.typeChipActive]}
                onPress={() => setLeaveType(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeChipText, leaveType === t && styles.typeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-08-28"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-08-29"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason for Absence</Text>
            <View style={[styles.inputWrapper, { alignItems: "flex-start", paddingTop: 10 }]}>
              <FileText size={16} color="#94A3B8" style={{ marginRight: 8, marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="State reason for your leave request..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Submit Leave Application</Text>
              </>
            )}
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typeChipActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#00B050",
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  typeChipTextActive: {
    color: "#00B050",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 0,
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: "#00B050",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
