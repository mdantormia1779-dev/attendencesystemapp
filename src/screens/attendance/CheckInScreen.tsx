import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Vibration,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Building2,
  AlertTriangle,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { attendanceService, TodayPunchState } from "../../services/attendanceService";
import { branchApi, BranchLocationData } from "../../api/branch";
import { validateGeofence } from "../../utils/geoUtils";

export default function CheckInScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"LOCATION" | "SUCCESS">("LOCATION");
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [gpsData, setGpsData] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    distanceMeters: number;
    branchName: string;
    isInside: boolean;
  }>({
    latitude: 0,
    longitude: 0,
    accuracy: null,
    distanceMeters: 0,
    branchName: "Loading branch...",
    isInside: false,
  });

  const [branchLocation, setBranchLocation] = useState<BranchLocationData | null>(null);
  const branchLocationRef = useRef<BranchLocationData | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [punchResult, setPunchResult] = useState<TodayPunchState | null>(null);
  const [punchType, setPunchType] = useState<"IN" | "OUT">("IN");

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchRealLocation();
    checkTodayStatus();
    startPulseAnimation();
  }, []);

  const checkTodayStatus = async () => {
    try {
      const today = await attendanceService.getTodayPunch();
      if (today.hasPunchedIn && !today.hasPunchedOut) {
        setPunchType("OUT");
      } else {
        setPunchType("IN");
      }
    } catch (e) {}
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const triggerHaptic = () => {
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate([0, 35, 25, 35]);
      } else {
        Vibration.vibrate(35);
      }
    } catch {}
  };

  const fetchRealLocation = async () => {
    setLoadingLoc(true);
    try {
      let branch: BranchLocationData | null = null;
      try {
        const branchRes = await branchApi.getBranchLocation();
        if (branchRes.success && branchRes.data) {
          branch = branchRes.data;
          setBranchLocation(branch);
          branchLocationRef.current = branch;
        }
      } catch (e) {
        console.log("Branch API fetch notice:", e);
      }

      if (!branch) {
        branch = branchLocationRef.current;
      }

      if (!branch || branch.latitude == null || branch.longitude == null) {
        setGpsData((prev) => ({
          ...prev,
          branchName: branch?.branchName || "No Branch Assigned",
          isInside: false,
          distanceMeters: 0,
        }));
        setLoadingLoc(false);
        Alert.alert(
          "Branch Not Configured",
          "Your branch location has not been configured by the organization administrator."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsData((prev) => ({
          ...prev,
          branchName: branch!.branchName,
          isInside: false,
        }));
        setLoadingLoc(false);
        Alert.alert("Permission Required", "GPS Location permission is required for attendance.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (loc && loc.coords) {
        const branchTarget = {
          latitude: branch.latitude as number,
          longitude: branch.longitude as number,
        };
        const allowedRadius = branch.geofenceRadius || 120;

        const geoCheck = validateGeofence(
          { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          branchTarget,
          allowedRadius
        );

        setGpsData({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          distanceMeters: Math.round(geoCheck.distanceMeters),
          branchName: branch.branchName,
          isInside: geoCheck.isInside,
        });
      }
    } catch (err) {
      setGpsData((prev) => ({ ...prev, isInside: false }));
    } finally {
      setLoadingLoc(false);
    }
  };

  const executeDirectPunch = async () => {
    if (submitting) return;

    if (!gpsData.isInside) {
      const radius = branchLocation?.geofenceRadius || user?.geofenceRadius || 120;
      Alert.alert(
        "Office Geofence Restricted",
        `You are currently ${gpsData.distanceMeters}m away from '${gpsData.branchName}'.\n\nYou must be within ${radius}m radius to punch attendance.`
      );
      return;
    }

    setSubmitting(true);
    try {
      let resultState: TodayPunchState;
      if (punchType === "OUT") {
        resultState = await attendanceService.punchOut(undefined, gpsData.latitude, gpsData.longitude);
      } else {
        resultState = await attendanceService.punchIn(undefined, gpsData.latitude, gpsData.longitude);
      }

      triggerHaptic();
      setPunchResult(resultState);
      setStep("SUCCESS");
    } catch (e: any) {
      Alert.alert("Punch Error", e?.message || "Could not record attendance. Please try again.");
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {step === "LOCATION" ? "Attendance Punch" : "Attendance Verified"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === "LOCATION" ? "GPS Geofence Verification" : "Official Timestamp Recorded"}
          </Text>
        </View>
        <View style={styles.badgeStep}>
          <Text style={styles.badgeStepText}>
            {step === "LOCATION" ? "1/1" : "✓"}
          </Text>
        </View>
      </View>

      {step === "LOCATION" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.radarCard}>
            <View style={styles.radarOuterRing}>
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.radarMidRing}>
                <View style={styles.radarCore}>
                  <MapPin size={36} color="#00B050" />
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.title}>GPS Geofence Attendance</Text>
          <Text style={styles.subtitle}>
            Your real-time GPS location is verified against your designated office branch perimeter.
          </Text>

          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              style={[styles.typeBtn, punchType === "IN" && styles.typeBtnActive]}
              onPress={() => setPunchType("IN")}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeBtnText, punchType === "IN" && styles.typeBtnTextActive]}>
                Punch-In (Check-In)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, punchType === "OUT" && styles.typeBtnActive]}
              onPress={() => setPunchType("OUT")}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeBtnText, punchType === "OUT" && styles.typeBtnTextActive]}>
                Punch-Out (Check-Out)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locCard}>
            <View style={styles.locHeader}>
              <View style={styles.locTitleRow}>
                <Building2 size={18} color="#00B050" style={{ marginRight: 6 }} />
                <Text style={styles.locBranchName}>{gpsData.branchName}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  gpsData.isInside ? styles.statusPillInside : styles.statusPillOutside,
                ]}
              >
                <ShieldCheck
                  size={14}
                  color={gpsData.isInside ? "#00B050" : "#DC2626"}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    gpsData.isInside ? styles.textInside : styles.textOutside,
                  ]}
                >
                  {gpsData.isInside ? "Inside Geofence" : "Outside Geofence"}
                </Text>
              </View>
            </View>

            <View style={styles.locMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Distance to Office</Text>
                <Text style={styles.metricVal}>{gpsData.distanceMeters} Meters</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Allowed Radius</Text>
                <Text style={styles.metricVal}>
                  {branchLocation?.geofenceRadius || 120}m (±{gpsData.accuracy ? Math.round(gpsData.accuracy) : 8}m)
                </Text>
              </View>
            </View>

            {branchLocation?.latitude != null && gpsData.latitude !== 0 && (
              <View style={styles.coordsRow}>
                <Text style={styles.coordText}>
                  Office: {branchLocation.latitude.toFixed(4)}, {branchLocation.longitude?.toFixed(4)}
                </Text>
                <Text style={styles.coordText}>
                  GPS: {gpsData.latitude.toFixed(4)}, {gpsData.longitude.toFixed(4)}
                </Text>
              </View>
            )}
          </View>

          {loadingLoc ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#00B050" size="small" />
              <Text style={styles.loadingText}>Syncing satellite GPS coordinates...</Text>
            </View>
          ) : (
            <View style={styles.actionBlock}>
              {!gpsData.isInside && (
                <View style={styles.outOfRangeNotice}>
                  <AlertTriangle size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.outOfRangeText}>
                    Attendance Locked: You are outside your designated office geofence ({gpsData.distanceMeters}m away).
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.refreshLocBtn}
                onPress={fetchRealLocation}
                activeOpacity={0.7}
              >
                <RefreshCw size={16} color="#64748B" />
                <Text style={styles.refreshLocText}>Refresh GPS Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  !gpsData.isInside && styles.primaryBtnDisabled,
                ]}
                onPress={executeDirectPunch}
                disabled={submitting || !gpsData.isInside}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>
                      {gpsData.isInside
                        ? punchType === "IN"
                          ? "Confirm Punch-In"
                          : "Confirm Punch-Out"
                        : "Location Restricted (Out of Range)"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {step === "SUCCESS" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.successContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIconCircle}>
            <CheckCircle2 size={48} color="#00B050" />
          </View>

          <Text style={styles.successTitle}>
            {punchType === "IN" ? "Punch-In Successful!" : "Punch-Out Successful!"}
          </Text>
          <Text style={styles.subtitle}>
            GPS Geofenced attendance has been recorded successfully in the system.
          </Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Punch Timestamp</Text>
              <Text style={styles.receiptVal}>
                {punchType === "IN" ? punchResult?.checkInTime : punchResult?.checkOutTime}
              </Text>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Office Perimeter</Text>
              <Text style={[styles.receiptVal, { color: "#00B050", fontWeight: "700" }]}>
                Verified ({gpsData.branchName})
              </Text>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Verification Method</Text>
              <Text style={[styles.receiptVal, { color: "#00B050" }]}>
                GPS Geofence Verified
              </Text>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Attendance Status</Text>
              <View
                style={[
                  styles.receiptBadge,
                  punchResult?.status === "LATE" ? styles.receiptLate : styles.receiptPresent,
                ]}
              >
                <Text
                  style={[
                    styles.receiptBadgeText,
                    punchResult?.status === "LATE" ? styles.textLate : styles.textPresent,
                  ]}
                >
                  {punchResult?.status || "PRESENT"}
                </Text>
              </View>
            </View>

            {punchType === "OUT" && (
              <>
                <View style={styles.receiptDivider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Shift Worked</Text>
                  <Text style={[styles.receiptVal, { color: "#00B050", fontWeight: "800" }]}>
                    {punchResult?.workedHours ?? 0} Hours
                  </Text>
                </View>
              </>
            )}
          </View>


          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              try {
                navigation.navigate("MainTabs", { screen: "HomeTab" });
              } catch (e) {
                navigation.goBack();
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Return to Home</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  badgeStep: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
  },
  badgeStepText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00B050",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  radarCard: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
  },
  radarOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0, 176, 80, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: "rgba(0, 176, 80, 0.3)",
  },
  radarMidRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0, 176, 80, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  radarCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    width: "100%",
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  typeBtnTextActive: {
    color: "#00B050",
  },
  locCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
  },
  locHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  locTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locBranchName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillInside: {
    backgroundColor: "#DCFCE7",
  },
  statusPillOutside: {
    backgroundColor: "#FEE2E2",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  textInside: {
    color: "#00B050",
  },
  textOutside: {
    color: "#DC2626",
  },
  locMetrics: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  coordsRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coordText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
  },
  actionBlock: {
    width: "100%",
  },
  outOfRangeNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 12,
  },
  outOfRangeText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
    lineHeight: 17,
  },
  refreshLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 10,
  },
  refreshLocText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 6,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00B050",
    borderRadius: 14,
    paddingVertical: 15,
    elevation: 2,
  },
  primaryBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  successContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 20,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 6,
  },
  receiptLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  receiptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptPresent: {
    backgroundColor: "#DCFCE7",
  },
  receiptLate: {
    backgroundColor: "#FEF3C7",
  },
  receiptBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  textPresent: {
    color: "#00B050",
  },
  textLate: {
    color: "#D97706",
  },
  doneBtn: {
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});