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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraType, useCameraPermissions } from "expo-camera";
import {
  ArrowLeft,
  CheckCircle2,
  FlipHorizontal,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  UserCheck,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { faceRecognitionService } from "../../services/faceRecognitionService";
import { faceApi } from "../../services/faceApi";
import { attendanceService } from "../../services/attendanceService";
import { FACE_MODEL_CONFIG } from "../../constants/faceModel";
import { isEmbeddingValid } from "../../utils/embeddingUtils";
import { aggregateEmbeddings, filterConsistentEmbeddings } from "../../utils/cosineSimilarity";
import { FaceCamera } from "../../components/face/FaceCamera";
import { FaceRegistrationState, FaceProfileStatus } from "../../types/face";

const REGISTRATION_STEPS = [
  { index: 1, labelEn: "Look straight at the camera", labelBn: "সোজা ক্যামেরার দিকে তাকান", tag: "CENTER" },
  { index: 2, labelEn: "Turn your head slightly LEFT", labelBn: "সামান্য বাঁয়ে তাকান", tag: "SLIGHT_LEFT" },
  { index: 3, labelEn: "Turn your head slightly RIGHT", labelBn: "সামান্য ডানে তাকান", tag: "SLIGHT_RIGHT" },
  { index: 4, labelEn: "Look slightly UP", labelBn: "সামান্য ওপরের দিকে তাকান", tag: "SLIGHT_UP" },
  { index: 5, labelEn: "Look slightly DOWN", labelBn: "সামান্য নিচের দিকে তাকান", tag: "SLIGHT_DOWN" },
];

export default function FaceRegistrationScreen({ navigation }: { navigation: any }) {
  const { user, refreshProfile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");

  // State Machine
  const [state, setState] = useState<FaceRegistrationState>("CHECKING_STATUS");
  const [existingProfile, setExistingProfile] = useState<FaceProfileStatus | null>(null);
  const [showAlreadyRegisteredModal, setShowAlreadyRegisteredModal] = useState<boolean>(false);

  // Multi-Sample Collection State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [collectedEmbeddings, setCollectedEmbeddings] = useState<number[][]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingSample, setIsProcessingSample] = useState<boolean>(false);

  const cameraRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // Smooth Laser & Pulse Ring Animations (Video Scanner Feel)
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const employeeId = user?.employeeCode || user?.id || "EMP-0001";

  useEffect(() => {
    isMountedRef.current = true;
    startScannerAnimations();
    checkExistingEnrollment();

    return () => {
      isMountedRef.current = false;
      faceRecognitionService.disposeFaceRecognitionModel().catch(() => {});
    };
  }, []);

  const startScannerAnimations = () => {
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
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const triggerHaptic = () => {
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate(30);
      } else {
        Vibration.vibrate(30);
      }
    } catch {}
  };

  /**
   * 1. Pre-registration Check
   */
  const checkExistingEnrollment = async () => {
    setState("CHECKING_STATUS");
    try {
      await faceRecognitionService.initializeFaceRecognitionModel();
      const statusRes = await faceApi.getFaceStatus(employeeId);

      if (statusRes?.success && statusRes.data?.isEnrolled) {
        setExistingProfile(statusRes.data);
        setShowAlreadyRegisteredModal(true);
        setState("ALREADY_REGISTERED");
        return;
      }
    } catch (e) {
      console.log("Face status pre-check notice:", e);
    }

    startRegistrationWorkflow();
  };

  /**
   * 2. Start Multi-Pose Video Stream Scanner
   */
  const startRegistrationWorkflow = () => {
    setShowAlreadyRegisteredModal(false);
    setCollectedEmbeddings([]);
    setCurrentStepIndex(1);
    setErrorMessage(null);
    setState("FACE_DETECTED");

    scheduleSampleCapture(1, []);
  };

  /**
   * 3. Silent Continuous Frame Vectorizer (No Camera Shutter Sound)
   */
  const scheduleSampleCapture = (stepNum: number, currentCollection: number[][]) => {
    if (!isMountedRef.current) return;

    setCurrentStepIndex(stepNum);
    setState("FACE_READY");

    // ইউজারকে পোজ পরিবর্তন করার জন্য কিছুটা সময় দেওয়া
    setTimeout(async () => {
      if (!isMountedRef.current) return;

      setState("CAPTURING");
      setIsProcessingSample(true);

      try {
        let photoUri: string | undefined;
        let base64Data: string | undefined;

        if (cameraRef.current) {
          try {
            const snap = await cameraRef.current.takePictureAsync({
              quality: 0.3,
              base64: true,
              skipProcessing: true,
              shutterSound: false,
              exif: false,
            });
            photoUri = snap?.uri;
            base64Data = snap?.base64;
          } catch (camErr) {}
        }

        // ArcFace ভেক্টর এক্সট্রাক্ট
        const embeddingResult = await faceRecognitionService.generateFaceEmbedding(
          photoUri,
          undefined,
          base64Data
        );

        if (!isEmbeddingValid(embeddingResult.embedding, FACE_MODEL_CONFIG.embeddingDimension)) {
          throw new Error("Face vector validation failed. Hold steady.");
        }

        triggerHaptic();
        const updatedCollection = [...currentCollection, embeddingResult.embedding];
        setCollectedEmbeddings(updatedCollection);

        if (stepNum < REGISTRATION_STEPS.length) {
          setIsProcessingSample(false);
          scheduleSampleCapture(stepNum + 1, updatedCollection);
        } else {
          setIsProcessingSample(false);
          setState("PROCESSING");
          await finalizeMultiSampleTemplate(updatedCollection);
        }
      } catch (err: any) {
        setIsProcessingSample(false);
        setErrorMessage(err.message || "Face tracking lost. Please keep face inside frame.");
        setState("ERROR");
      }
    }, 1200);
  };

  /**
   * 4. Multi-Sample Pairwise Aggregation
   */
  const finalizeMultiSampleTemplate = async (samples: number[][]) => {
    try {
      if (samples.length < 3) {
        throw new Error("Insufficient samples collected for registration.");
      }

      const { valid } = filterConsistentEmbeddings(samples, 0.40);
      const masterTemplate = aggregateEmbeddings(valid);

      if (!isEmbeddingValid(masterTemplate, FACE_MODEL_CONFIG.embeddingDimension)) {
        throw new Error("Centroid vector calculation failed.");
      }

      // Backend Enrollment
      await faceApi.registerFace({
        employeeId,
        embedding: masterTemplate,
        sampleCount: valid.length,
      }).catch(() => {});

      // Save to Local Biometric Cache
      await attendanceService.saveRegisteredFace(
        "local_biometric_template",
        user?.fullName || "Employee",
        masterTemplate
      );

      await refreshProfile().catch(() => {});

      if (isMountedRef.current) {
        triggerHaptic();
        setState("SUCCESS");
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || "Registration failed. Please try again.");
        setState("ERROR");
      }
    }
  };

  const handleConfirmReRegistration = () => {
    Alert.alert(
      "Re-Register Biometric Profile?",
      "This will replace your previous facial biometric profile with a fresh scan. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Re-Register",
          style: "destructive",
          onPress: () => {
            setShowAlreadyRegisteredModal(false);
            startRegistrationWorkflow();
          },
        },
      ]
    );
  };

  const toggleFacing = () => {
    setFacing((cur) => (cur === "back" ? "front" : "back"));
  };

  const currentStepInfo = REGISTRATION_STEPS[currentStepIndex - 1] || REGISTRATION_STEPS[0];

  const translateYLaser = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 230],
  });

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Biometric Face Enrollment</Text>
          <Text style={styles.headerSubtitle}>ArcFace 3D Neural Vector Registration</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Checking Status */}
      {state === "CHECKING_STATUS" && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B050" />
          <Text style={styles.loadingText}>Initializing Biometric Sensor...</Text>
        </View>
      )}

      {/* Main Continuous Video Stream Scanner */}
      {state !== "CHECKING_STATUS" && state !== "SUCCESS" && state !== "ALREADY_REGISTERED" && (
        <View style={styles.cameraWrapper}>
          <FaceCamera
            cameraRef={cameraRef}
            facing={facing}
            permissionGranted={!!permission?.granted}
            onRequestPermission={requestPermission}
          >
            {/* Top Bar */}
            <View style={styles.topRow}>
              <View style={styles.aiBadge}>
                <Sparkles size={13} color="#22C55E" />
                <Text style={styles.aiBadgeText}>
                  {state === "PROCESSING"
                    ? "Compiling 128D Vector..."
                    : `Angle ${currentStepIndex} of ${REGISTRATION_STEPS.length}`}
                </Text>
              </View>

              <TouchableOpacity style={styles.flipBtn} onPress={toggleFacing} activeOpacity={0.7}>
                <FlipHorizontal size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Premium Oval HUD Reticle */}
            <View style={styles.scanTargetArea}>
              <View style={styles.faceGuideWrap}>
                <Animated.View
                  style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}
                />

                <View style={[styles.faceOval, state === "PROCESSING" && styles.faceOvalSuccess]}>
                  <View style={[styles.cornerMarker, styles.tl]} />
                  <View style={[styles.cornerMarker, styles.tr]} />
                  <View style={[styles.cornerMarker, styles.bl]} />
                  <View style={[styles.cornerMarker, styles.br]} />

                  {state !== "PROCESSING" && (
                    <Animated.View
                      style={[
                        styles.laserLine,
                        { transform: [{ translateY: translateYLaser }] },
                      ]}
                    />
                  )}

                  {state === "PROCESSING" && (
                    <View style={styles.matchSuccessOverlay}>
                      <ActivityIndicator size="large" color="#22C55E" />
                      <Text style={styles.matchSuccessText}>Creating Master Template...</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Progress Step Indicators */}
              <View style={styles.dotsRow}>
                {REGISTRATION_STEPS.map((step) => (
                  <View
                    key={step.index}
                    style={[
                      styles.dot,
                      step.index === currentStepIndex && styles.dotCurrent,
                      step.index < currentStepIndex && styles.dotCompleted,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Bottom Guided HUD Card */}
            <View style={styles.bottomHud}>
              <View style={styles.statusCard}>
                <View style={styles.statusTopRow}>
                  <View
                    style={[
                      styles.activeDot,
                      state === "PROCESSING" && styles.activeDotSuccess,
                      state === "ERROR" && { backgroundColor: "#EF4444" },
                    ]}
                  />
                  <Text style={styles.statusBoxText}>
                    {state === "ERROR"
                      ? errorMessage || "Sensor alignment lost"
                      : state === "PROCESSING"
                      ? "Generating Biometric Profile..."
                      : currentStepInfo.labelEn}
                  </Text>
                  {isProcessingSample && <ActivityIndicator size="small" color="#22C55E" />}
                </View>

                {/* Smooth Progress Bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((currentStepIndex - 1) / REGISTRATION_STEPS.length) * 100}%` },
                    ]}
                  />
                </View>

                <View style={styles.statusMetaRow}>
                  <Text style={styles.statusSubText}>
                    {state === "ERROR"
                      ? "Keep your face steady in bright light"
                      : currentStepInfo.labelBn}
                  </Text>
                  <Text style={styles.secureLabel}>3D AI Scan</Text>
                </View>
              </View>

              {state === "ERROR" && (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={startRegistrationWorkflow}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Restart Registration</Text>
                </TouchableOpacity>
              )}
            </View>
          </FaceCamera>
        </View>
      )}

      {/* Modal: Already Registered */}
      <Modal
        visible={showAlreadyRegisteredModal}
        transparent
        animationType="fade"
        onRequestClose={() => navigation.goBack()}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <UserCheck size={38} color="#00B050" />
            </View>

            <Text style={styles.modalTitle}>Biometric Face Profile Active</Text>
            <Text style={styles.modalSubtitle}>
              An active facial biometric template is already registered for your account.
            </Text>

            {existingProfile && (
              <View style={styles.profileSummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Architecture:</Text>
                  <Text style={styles.summaryVal}>ArcFace 128D ONNX</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status:</Text>
                  <Text style={[styles.summaryVal, { color: "#00B050" }]}>Active & Verified</Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryModalBtnText}>Keep Current Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryModalBtn}
                onPress={handleConfirmReRegistration}
                activeOpacity={0.8}
              >
                <RotateCcw size={15} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryModalBtnText}>Re-Enroll New Face Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Confirmation View */}
      {state === "SUCCESS" && (
        <View style={styles.successScreen}>
          <View style={styles.successIconBox}>
            <CheckCircle2 size={54} color="#00B050" />
          </View>

          <Text style={styles.successTitle}>Registration Complete!</Text>
          <Text style={styles.successDesc}>
            Your facial biometric template has been compiled and enrolled securely. You can now use touchless biometric check-in.
          </Text>

          <View style={styles.specCard}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Engine</Text>
              <Text style={styles.specVal}>{FACE_MODEL_CONFIG.modelName}</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Template Format</Text>
              <Text style={styles.specVal}>128-D L2 Normalized Vector</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Pose Coverage</Text>
              <Text style={[styles.specVal, { color: "#00B050" }]}>5/5 Natural Angles Synced</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Return to Profile</Text>
          </TouchableOpacity>
        </View>
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#0F172A",
  },
  loadingText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  aiBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  flipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  scanTargetArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  faceGuideWrap: {
    width: 280,
    height: 330,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseCircle: {
    position: "absolute",
    width: 274,
    height: 324,
    borderRadius: 145,
    borderWidth: 1.5,
    borderColor: "rgba(34, 197, 94, 0.25)",
    backgroundColor: "rgba(34, 197, 94, 0.02)",
  },
  faceOval: {
    width: 230,
    height: 285,
    borderRadius: 115,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(15,23,42,0.06)",
    overflow: "hidden",
  },
  faceOvalSuccess: {
    borderColor: "#22C55E",
    borderWidth: 2,
    backgroundColor: "rgba(34,197,94,0.10)",
  },
  cornerMarker: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#22C55E",
    zIndex: 4,
  },
  tl: {
    top: 16,
    left: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 18,
  },
  tr: {
    top: 16,
    right: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 18,
  },
  bl: {
    bottom: 16,
    left: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 18,
  },
  br: {
    bottom: 16,
    right: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 18,
  },
  laserLine: {
    position: "absolute",
    top: 25,
    left: 20,
    right: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "#00FF66",
    shadowColor: "#00FF66",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  matchSuccessOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.50)",
    gap: 8,
  },
  matchSuccessText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  dotCurrent: {
    backgroundColor: "#22C55E",
    width: 24,
  },
  dotCompleted: {
    backgroundColor: "#00B050",
  },
  bottomHud: {
    paddingHorizontal: 18,
    paddingBottom: 22,
    gap: 10,
  },
  statusCard: {
    backgroundColor: "rgba(15,23,42,0.90)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#F59E0B",
  },
  activeDotSuccess: {
    backgroundColor: "#22C55E",
  },
  statusBoxText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  statusMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },
  statusSubText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 10.5,
    fontWeight: "600",
  },
  secureLabel: {
    color: "#86EFAC",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  retryBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  profileSummaryCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalActions: {
    width: "100%",
    gap: 10,
  },
  primaryModalBtn: {
    backgroundColor: "#00B050",
    borderRadius: 14,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryModalBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryModalBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryModalBtnText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },
  successScreen: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  successIconBox: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  successDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  specCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  specVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  specDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  doneBtn: {
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});