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
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraType, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Building2,
  AlertTriangle,
  Camera as CameraIcon,
  Fingerprint,
  Sparkles,
  FlipHorizontal,
  UserCheck,
  Lock,
  Unlock,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { attendanceService, TodayPunchState, RegisteredFaceData } from "../../services/attendanceService";
import { branchApi, BranchLocationData } from "../../api/branch";
import { validateGeofence } from "../../utils/geoUtils";
import { biometricService, BiometricStatus } from "../../services/biometricService";
import { faceRecognitionService } from "../../services/faceRecognitionService";
import { FaceCamera } from "../../components/face/FaceCamera";

const { width } = Dimensions.get("window");

export type BiometricMode = "FACE" | "FINGERPRINT";

export default function CheckInScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { user } = useAuth();
  const initialMode: BiometricMode = route?.params?.mode === "FINGERPRINT" ? "FINGERPRINT" : "FACE";

  const [activeBiometric, setActiveBiometric] = useState<BiometricMode>(initialMode);
  const [step, setStep] = useState<"VERIFY" | "SUCCESS">("VERIFY");
  const [loadingLoc, setLoadingLoc] = useState(true);

  // GPS & Branch Geofence State
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
    branchName: "Locating office branch...",
    isInside: false,
  });

  const [branchLocation, setBranchLocation] = useState<BranchLocationData | null>(null);
  const branchLocationRef = useRef<BranchLocationData | null>(null);

  // Punch State
  const [submitting, setSubmitting] = useState(false);
  const [punchResult, setPunchResult] = useState<TodayPunchState | null>(null);
  const [punchType, setPunchType] = useState<"IN" | "OUT">("IN");

  // Face Verification State
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [faceData, setFaceData] = useState<RegisteredFaceData>({ registered: false });
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [faceFeedback, setFaceFeedback] = useState<string>("Keep face centered in frame");
  const [faceMatched, setFaceMatched] = useState<boolean | null>(null);
  const [faceScore, setFaceScore] = useState<number>(0);
  const cameraRef = useRef<any>(null);

  // Fingerprint State
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricChecking, setBiometricChecking] = useState(false);

  // Animations
  const laserAnim = useRef(new Animated.Value(0)).current;
  const fpPulseAnim = useRef(new Animated.Value(1)).current;
  const lockPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchRealLocation();
    checkTodayStatus();
    loadBiometricsAndFace();
    startAnimations();
    faceRecognitionService.initializeFaceRecognitionModel().catch(() => {});
  }, []);

  const loadBiometricsAndFace = async () => {
    try {
      const [face, bio] = await Promise.all([
        attendanceService.getRegisteredFace(),
        biometricService.checkBiometricAvailability(),
      ]);
      setFaceData(face);
      setBiometricStatus(bio);
    } catch (e) {
      console.log("Biometrics status load notice:", e);
    }
  };

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

  const startAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(fpPulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(fpPulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(lockPulseAnim, {
          toValue: 1.08,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(lockPulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const triggerHaptic = (success = true) => {
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate(success ? [0, 35, 25, 35] : [0, 60, 40, 60]);
      } else {
        Vibration.vibrate(success ? 35 : 60);
      }
    } catch {}
  };

  /**
   * 1. Check Real-Time GPS Location against Office Geofence
   */
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
          branchName: branch?.branchName || user?.branch || "Main Office",
          isInside: false,
          distanceMeters: 0,
        }));
        setLoadingLoc(false);
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
        Alert.alert("Permission Required", "GPS Location permission is required to verify office perimeter.");
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
        const allowedRadius = branch.geofenceRadius || user?.geofenceRadius || 120;

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

  /**
   * 2. Face Verification Punch (Requires GPS inside office)
   */
  const handleFaceVerifyAndPunch = async () => {
    if (submitting || faceVerifying) return;

    if (!gpsData.isInside) {
      const radius = branchLocation?.geofenceRadius || user?.geofenceRadius || 120;
      triggerHaptic(false);
      Alert.alert(
        "Location Locked",
        `You are outside office premises (${gpsData.distanceMeters}m away from '${gpsData.branchName}').\n\nYou must be within ${radius}m radius to verify face attendance.`
      );
      return;
    }

    if (!faceData.registered || !faceData.faceDescriptor) {
      Alert.alert(
        "Face Not Enrolled",
        "You haven't enrolled your facial biometrics yet. Please enroll your face first to punch with Face ID.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enroll Face Now", onPress: () => navigation.navigate("FaceRegistration") },
        ]
      );
      return;
    }

    setFaceVerifying(true);
    setFaceFeedback("Scanning face with ArcFace AI...");

    try {
      let photoUri: string | undefined;
      let base64Data: string | undefined;

      if (cameraRef.current) {
        try {
          const snap = await cameraRef.current.takePictureAsync({
            quality: 0.5,
            base64: true,
            skipProcessing: false,
            shutterSound: false,
            exif: false,
          });
          photoUri = snap?.uri;
          base64Data = snap?.base64;
        } catch (camErr) {}
      }

      // Generate probe vector
      const probe = await faceRecognitionService.generateFaceEmbedding(photoUri, undefined, base64Data);

      // Compare probe against registered baseline
      const verification = faceRecognitionService.compareFaceEmbeddings(
        probe.embedding,
        faceData.faceDescriptor,
        0.58
      );

      const scorePercent = Math.round(verification.similarity * 100);
      setFaceScore(scorePercent);

      if (!verification.matched) {
        setFaceMatched(false);
        setFaceFeedback(`Face Match Failed (${scorePercent}%). Align face in good lighting.`);
        triggerHaptic(false);
        Alert.alert(
          "Face Not Recognized",
          `Match score: ${scorePercent}% (Required: 58%).\nPlease center your face in good light and retry.`
        );
        return;
      }

      setFaceMatched(true);
      setFaceFeedback(`Identity Verified (${scorePercent}% Match)! Recording attendance...`);
      setSubmitting(true);

      let resultState: TodayPunchState;
      if (punchType === "OUT") {
        resultState = await attendanceService.punchOut(
          photoUri,
          gpsData.latitude,
          gpsData.longitude,
          "FACE_RECOGNITION",
          scorePercent
        );
      } else {
        resultState = await attendanceService.punchIn(
          photoUri,
          gpsData.latitude,
          gpsData.longitude,
          "FACE_RECOGNITION",
          scorePercent
        );
      }

      triggerHaptic(true);
      setPunchResult(resultState);
      setStep("SUCCESS");
    } catch (e: any) {
      Alert.alert("Face Verification Error", e?.message || "Could not complete face verification.");
      setFaceFeedback("Verification error. Please retry.");
    } finally {
      setFaceVerifying(false);
      setSubmitting(false);
    }
  };

  /**
   * 3. Fingerprint Biometric Punch (Requires GPS inside office)
   */
  const handleFingerprintPunch = async () => {
    if (submitting || biometricChecking) return;

    if (!gpsData.isInside) {
      const radius = branchLocation?.geofenceRadius || user?.geofenceRadius || 120;
      triggerHaptic(false);
      Alert.alert(
        "Location Locked",
        `You are outside office premises (${gpsData.distanceMeters}m away from '${gpsData.branchName}').\n\nYou must be within ${radius}m radius to punch biometric attendance.`
      );
      return;
    }

    setBiometricChecking(true);
    try {
      const authResult = await biometricService.authenticateBiometric(
        `Scan fingerprint to record ${punchType === "IN" ? "Check-In" : "Check-Out"}`
      );

      if (!authResult.success) {
        if (authResult.error && !authResult.error.includes("cancelled")) {
          Alert.alert("Biometric Verification Failed", authResult.error);
        }
        return;
      }

      setSubmitting(true);
      let resultState: TodayPunchState;
      if (punchType === "OUT") {
        resultState = await attendanceService.punchOut(
          undefined,
          gpsData.latitude,
          gpsData.longitude,
          "BIOMETRIC_DEVICE"
        );
      } else {
        resultState = await attendanceService.punchIn(
          undefined,
          gpsData.latitude,
          gpsData.longitude,
          "BIOMETRIC_DEVICE"
        );
      }

      triggerHaptic(true);
      setPunchResult(resultState);
      setStep("SUCCESS");
    } catch (e: any) {
      Alert.alert("Punch Error", e?.message || "Could not record biometric attendance.");
    } finally {
      setBiometricChecking(false);
      setSubmitting(false);
    }
  };

  const translateYLaser = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 190],
  });

  const allowedRadius = branchLocation?.geofenceRadius || user?.geofenceRadius || 120;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {step === "VERIFY" ? "Daily Attendance Punch" : "Attendance Recorded"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === "VERIFY" ? "GPS Geofence + Biometric Security" : "Official Timestamp Recorded"}
          </Text>
        </View>
        <View style={styles.badgeStep}>
          <Text style={styles.badgeStepText}>{step === "VERIFY" ? "2-STEP" : "✓"}</Text>
        </View>
      </View>

      {step === "VERIFY" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Shift Type Switcher (Check-In vs Check-Out) */}
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

          {/* ========================================================
              STEP 1: LOCATION GEOFENCE CHECK (THE GATEKEEPER)
             ======================================================== */}
          <View style={[styles.stepCard, gpsData.isInside ? styles.stepCardSuccess : styles.stepCardLocked]}>
            <View style={styles.stepHeader}>
              <View style={styles.stepTagRow}>
                <View style={[styles.stepNumberBadge, gpsData.isInside ? styles.badgeSuccessBg : styles.badgeLockedBg]}>
                  <Text style={[styles.stepNumberText, gpsData.isInside ? styles.badgeSuccessText : styles.badgeLockedText]}>
                    STEP 1
                  </Text>
                </View>
                <Text style={styles.stepHeaderTitle}>Office Location Verification</Text>
              </View>

              <View style={[styles.statusPill, gpsData.isInside ? styles.statusPillInside : styles.statusPillOutside]}>
                {gpsData.isInside ? (
                  <ShieldCheck size={13} color="#00B050" style={{ marginRight: 4 }} />
                ) : (
                  <ShieldAlert size={13} color="#DC2626" style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.statusPillText, gpsData.isInside ? styles.textInside : styles.textOutside]}>
                  {gpsData.isInside ? "Inside Office" : "Outside Office"}
                </Text>
              </View>
            </View>

            {/* Branch Details */}
            <View style={styles.locBranchRow}>
              <Building2 size={16} color={gpsData.isInside ? "#00B050" : "#64748B"} style={{ marginRight: 6 }} />
              <Text style={styles.locBranchText}>{gpsData.branchName}</Text>
            </View>

            {/* Location Metrics */}
            <View style={styles.locMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Distance to Office</Text>
                <Text style={[styles.metricVal, !gpsData.isInside && { color: "#DC2626" }]}>
                  {loadingLoc ? "Checking..." : `${gpsData.distanceMeters} Meters`}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Allowed Radius</Text>
                <Text style={styles.metricVal}>{allowedRadius}m</Text>
              </View>
            </View>

            {/* Location Banner (Unlocked vs Locked) */}
            {loadingLoc ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#00B050" />
                <Text style={styles.loadingRowText}>Verifying GPS satellite coordinates...</Text>
              </View>
            ) : gpsData.isInside ? (
              <View style={styles.locUnlockedBanner}>
                <Unlock size={16} color="#00B050" style={{ marginRight: 6 }} />
                <Text style={styles.locUnlockedText}>
                  Location Verified! You are inside the office radius. Biometrics unlocked below.
                </Text>
              </View>
            ) : (
              <View style={styles.locLockedBanner}>
                <Lock size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLockedTitle}>Location Restricted ({gpsData.distanceMeters}m away)</Text>
                  <Text style={styles.locLockedText}>
                    You must be within {allowedRadius}m of {gpsData.branchName} to unlock Face ID or Fingerprint attendance.
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.refreshBtn} onPress={fetchRealLocation} activeOpacity={0.7}>
              <RefreshCw size={14} color="#64748B" />
              <Text style={styles.refreshBtnText}>Refresh GPS Coordinates</Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================
              STEP 2: BIOMETRIC VERIFICATION (FACE ID OR FINGERPRINT)
             ======================================================== */}
          <View style={[styles.stepCard, !gpsData.isInside && styles.stepCardDisabled]}>
            <View style={styles.stepHeader}>
              <View style={styles.stepTagRow}>
                <View style={[styles.stepNumberBadge, gpsData.isInside ? styles.badgeSuccessBg : styles.badgeDisabledBg]}>
                  <Text style={[styles.stepNumberText, gpsData.isInside ? styles.badgeSuccessText : styles.badgeDisabledText]}>
                    STEP 2
                  </Text>
                </View>
                <Text style={styles.stepHeaderTitle}>Biometric Verification</Text>
              </View>
            </View>

            {/* Biometric Method Selector (Face ID vs Fingerprint) */}
            <View style={styles.biometricTabsRow}>
              <TouchableOpacity
                style={[styles.bioTab, activeBiometric === "FACE" && styles.bioTabActive]}
                onPress={() => setActiveBiometric("FACE")}
                activeOpacity={0.8}
              >
                <CameraIcon size={16} color={activeBiometric === "FACE" ? "#00B050" : "#64748B"} />
                <Text style={[styles.bioTabText, activeBiometric === "FACE" && styles.bioTabTextActive]}>
                  Face ID AI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bioTab, activeBiometric === "FINGERPRINT" && styles.bioTabActive]}
                onPress={() => setActiveBiometric("FINGERPRINT")}
                activeOpacity={0.8}
              >
                <Fingerprint size={16} color={activeBiometric === "FINGERPRINT" ? "#00B050" : "#64748B"} />
                <Text style={[styles.bioTabText, activeBiometric === "FINGERPRINT" && styles.bioTabTextActive]}>
                  Fingerprint
                </Text>
              </TouchableOpacity>
            </View>

            {/* If OUTSIDE Geofence: Show clear lock overlay */}
            {!gpsData.isInside ? (
              <View style={styles.lockedBiometricBox}>
                <Animated.View style={[styles.lockedIconCircle, { transform: [{ scale: lockPulseAnim }] }]}>
                  <Lock size={32} color="#DC2626" />
                </Animated.View>
                <Text style={styles.lockedTitle}>Biometric Scanner Locked</Text>
                <Text style={styles.lockedDesc}>
                  Enter designated office branch area ({gpsData.branchName}) to enable Face ID or Fingerprint attendance punch.
                </Text>
              </View>
            ) : (
              /* If INSIDE Geofence: Unlocked Biometric Views */
              <View style={{ width: "100%", marginTop: 8 }}>
                {activeBiometric === "FACE" ? (
                  /* FACE ID SCANNER */
                  !faceData.registered ? (
                    <View style={styles.faceNotEnrolledCard}>
                      <UserCheck size={36} color="#D97706" style={{ marginBottom: 8 }} />
                      <Text style={styles.faceEnrollTitle}>Face Biometrics Not Enrolled</Text>
                      <Text style={styles.faceEnrollDesc}>
                        Please enroll your face profile once to use instant touchless Face AI attendance.
                      </Text>
                      <TouchableOpacity
                        style={styles.enrollNowBtn}
                        onPress={() => navigation.navigate("FaceRegistration")}
                        activeOpacity={0.85}
                      >
                        <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.enrollNowBtnText}>Enroll Face Profile Now</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.cameraBoxContainer}>
                      <View style={styles.cameraFrame}>
                        <FaceCamera
                          cameraRef={cameraRef}
                          facing={facing}
                          permissionGranted={!!permission?.granted}
                          onRequestPermission={requestPermission}
                        >
                          <View style={styles.camTopActions}>
                            <View style={styles.aiTag}>
                              <Sparkles size={12} color="#00B050" />
                              <Text style={styles.aiTagText}>ArcFace AI Live</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.camFlipBtn}
                              onPress={() => setFacing((prev) => (prev === "front" ? "back" : "front"))}
                              activeOpacity={0.7}
                            >
                              <FlipHorizontal size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>

                          {/* Oval Guide with Laser */}
                          <View style={styles.ovalGuideWrapper} pointerEvents="none">
                            <View
                              style={[
                                styles.ovalGuide,
                                faceMatched === true && styles.ovalGuideSuccess,
                                faceMatched === false && styles.ovalGuideError,
                              ]}
                            >
                              <Animated.View
                                style={[
                                  styles.laserLine,
                                  { transform: [{ translateY: translateYLaser }] },
                                ]}
                              />
                            </View>
                          </View>

                          <View style={styles.camBottomFeedback}>
                            <Text style={styles.feedbackText}>{faceFeedback}</Text>
                          </View>
                        </FaceCamera>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.primaryPunchBtn,
                          (faceVerifying || submitting) && styles.primaryPunchBtnDisabled,
                        ]}
                        onPress={handleFaceVerifyAndPunch}
                        disabled={faceVerifying || submitting}
                        activeOpacity={0.85}
                      >
                        {faceVerifying || submitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <CameraIcon size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryPunchBtnText}>
                              {punchType === "IN" ? "Verify Face & Punch In" : "Verify Face & Punch Out"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )
                ) : (
                  /* FINGERPRINT SCANNER */
                  <View style={styles.fpContainer}>
                    <View style={styles.fpRadarCard}>
                      <Animated.View
                        style={[
                          styles.fpPulseRing,
                          { transform: [{ scale: fpPulseAnim }] },
                        ]}
                      />
                      <TouchableOpacity
                        style={styles.fpTouchTarget}
                        onPress={handleFingerprintPunch}
                        disabled={biometricChecking || submitting}
                        activeOpacity={0.7}
                      >
                        <Fingerprint size={52} color="#00B050" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.fpTitle}>
                      {biometricStatus?.typeLabel || "Touch Fingerprint Sensor"}
                    </Text>
                    <Text style={styles.fpSubtitle}>
                      Tap the fingerprint sensor on your phone or tap the scanner button below to punch attendance.
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.primaryPunchBtn,
                        (biometricChecking || submitting) && styles.primaryPunchBtnDisabled,
                      ]}
                      onPress={handleFingerprintPunch}
                      disabled={biometricChecking || submitting}
                      activeOpacity={0.85}
                    >
                      {biometricChecking || submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Fingerprint size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.primaryPunchBtnText}>
                            {punchType === "IN" ? "Scan Fingerprint to Punch In" : "Scan Fingerprint to Punch Out"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ========================================================
          STEP 3: SUCCESS CONFIRMATION RECEIPT
         ======================================================== */}
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
            GPS Office perimeter & Biometric identity verified successfully.
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
              <View style={styles.receiptMethodBadge}>
                {punchResult?.verificationMethod === "FACE_RECOGNITION" ? (
                  <>
                    <CameraIcon size={14} color="#00B050" style={{ marginRight: 4 }} />
                    <Text style={styles.receiptMethodText}>
                      Face AI Verified ({punchResult?.faceMatchScore || faceScore || 98}%)
                    </Text>
                  </>
                ) : (
                  <>
                    <Fingerprint size={14} color="#00B050" style={{ marginRight: 4 }} />
                    <Text style={styles.receiptMethodText}>Fingerprint Biometric Verified</Text>
                  </>
                )}
              </View>
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
    paddingHorizontal: 18,
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
    padding: 16,
    alignItems: "center",
  },
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    width: "100%",
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  typeBtnTextActive: {
    color: "#00B050",
  },
  stepCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  stepCardSuccess: {
    borderColor: "#BBF7D0",
  },
  stepCardLocked: {
    borderColor: "#FECACA",
  },
  stepCardDisabled: {
    opacity: 0.9,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  stepTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepNumberBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSuccessBg: {
    backgroundColor: "#DCFCE7",
  },
  badgeLockedBg: {
    backgroundColor: "#FEE2E2",
  },
  badgeDisabledBg: {
    backgroundColor: "#F1F5F9",
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badgeSuccessText: {
    color: "#00B050",
  },
  badgeLockedText: {
    color: "#DC2626",
  },
  badgeDisabledText: {
    color: "#94A3B8",
  },
  stepHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillInside: {
    backgroundColor: "#DCFCE7",
  },
  statusPillOutside: {
    backgroundColor: "#FEE2E2",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textInside: {
    color: "#00B050",
  },
  textOutside: {
    color: "#DC2626",
  },
  locBranchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locBranchText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  locMetrics: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
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
    fontSize: 10,
    color: "#64748B",
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 8,
  },
  loadingRowText: {
    fontSize: 12,
    color: "#64748B",
  },
  locUnlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 8,
  },
  locUnlockedText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  locLockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 8,
  },
  locLockedTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 2,
  },
  locLockedText: {
    fontSize: 11,
    color: "#991B1B",
    lineHeight: 15,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 6,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  biometricTabsRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    width: "100%",
    marginBottom: 10,
  },
  bioTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  bioTabActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  bioTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  bioTabTextActive: {
    color: "#00B050",
  },
  lockedBiometricBox: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  lockedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 4,
  },
  lockedDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
  },
  faceNotEnrolledCard: {
    alignItems: "center",
    paddingVertical: 18,
  },
  faceEnrollTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  faceEnrollDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  enrollNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00B050",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  enrollNowBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  cameraBoxContainer: {
    width: "100%",
    alignItems: "center",
  },
  cameraFrame: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  camTopActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aiTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  camFlipBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  ovalGuideWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ovalGuide: {
    width: 160,
    height: 195,
    borderRadius: 80,
    borderWidth: 2.5,
    borderColor: "rgba(0, 176, 80, 0.8)",
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
  },
  ovalGuideSuccess: {
    borderColor: "#00B050",
    borderStyle: "solid",
  },
  ovalGuideError: {
    borderColor: "#DC2626",
  },
  laserLine: {
    width: "100%",
    height: 2,
    backgroundColor: "#00B050",
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  camBottomFeedback: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 10,
  },
  feedbackText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryPunchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00B050",
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
    marginTop: 12,
    elevation: 3,
  },
  primaryPunchBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  primaryPunchBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  fpContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
  },
  fpRadarCard: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0, 176, 80, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 10,
  },
  fpPulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(0, 176, 80, 0.35)",
  },
  fpTouchTarget: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fpTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
    textAlign: "center",
  },
  fpSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  successContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 18,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 2,
  },
  receiptLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  receiptVal: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  receiptMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  receiptMethodText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00B050",
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
    backgroundColor: "#00B050",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});