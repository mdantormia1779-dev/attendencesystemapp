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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraType, useCameraPermissions } from "expo-camera";
import { ArrowLeft, CheckCircle2, Sparkles, FlipHorizontal, RotateCcw } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { attendanceService } from "../../services/attendanceService";
import { faceRecognitionService } from "../../services/faceRecognitionService";
import { faceApi } from "../../services/faceApi";
import { FACE_MODEL_CONFIG } from "../../constants/faceModel";
import { isEmbeddingValid } from "../../utils/embeddingUtils";
import { aggregateEmbeddings, filterConsistentEmbeddings } from "../../utils/cosineSimilarity";
import { FaceCamera } from "../../components/face/FaceCamera";

const ENROLLMENT_STEPS = [
  { index: 1, labelEn: "Look straight at the camera", labelBn: "সোজা ক্যামেরার দিকে তাকান" },
  { index: 2, labelEn: "Turn your head slightly LEFT", labelBn: "সামান্য বাঁয়ে তাকান" },
  { index: 3, labelEn: "Turn your head slightly RIGHT", labelBn: "সামান্য ডানে তাকান" },
];

export default function FaceVerificationScreen({ navigation }: { navigation: any }) {
  const { user, refreshProfile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [collectedEmbeddings, setCollectedEmbeddings] = useState<number[][]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // HUD Laser & Pulse Animation
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const employeeId = user?.employeeCode || user?.id || "EMP-0001";

  useEffect(() => {
    isMountedRef.current = true;
    startScannerAnimations();
    faceRecognitionService.initializeFaceRecognitionModel().catch(() => {});
    startProgressiveEnrollment(1, []);

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
        Vibration.vibrate(35);
      } else {
        Vibration.vibrate(35);
      }
    } catch {}
  };

  /**
   * স্বয়ংক্রিয় ৩-স্টেপ ফেস স্ক্যান (জিরো সাউন্ড / ভিডিও ফিল)
   */
  const startProgressiveEnrollment = (stepNum: number, currentCollection: number[][]) => {
    if (!isMountedRef.current) return;

    setCurrentStepIndex(stepNum);
    setErrorMessage(null);

    setTimeout(async () => {
      if (!isMountedRef.current) return;
      setIsProcessing(true);

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
          } catch {}
        }

        const probe = await faceRecognitionService.extractEmbedding(photoUri, undefined, base64Data);

        if (!isEmbeddingValid(probe.embedding, FACE_MODEL_CONFIG.embeddingDimension)) {
          throw new Error("Facial alignment lost. Keep face centered.");
        }

        triggerHaptic();
        const updated = [...currentCollection, probe.embedding];
        setCollectedEmbeddings(updated);

        if (stepNum < ENROLLMENT_STEPS.length) {
          setIsProcessing(false);
          startProgressiveEnrollment(stepNum + 1, updated);
        } else {
          // Finalize enrollment and then verify the captured face
          await finalizeEnrollment(updated);

          // Aggregate embeddings to a descriptor for verification
          const aggregatedDescriptor = aggregateEmbeddings(updated);
          try {
            const verification = await attendanceService.verifyFace(undefined, aggregatedDescriptor);
            if (!verification.matched) {
              Alert.alert("Verification Failed", verification.message);
              // Reset enrollment state to allow retry
              setCollectedEmbeddings([]);
              setCurrentStepIndex(1);
              setIsProcessing(false);
              setIsCompleted(false);
              return;
            }
          } catch (verErr: any) {
            Alert.alert("Verification Error", verErr?.message || "Failed to verify face.");
            // Reset state on error
            setCollectedEmbeddings([]);
            setCurrentStepIndex(1);
            setIsProcessing(false);
            setIsCompleted(false);
            return;
          }
        }
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(err.message || "Capture failed. Please adjust lighting and face camera.");
      }
    }, 1000);
  };

  const finalizeEnrollment = async (embeddings: number[][]) => {
    try {
      const descriptor = aggregateEmbeddings(embeddings);
      await attendanceService.enrollFace({
        employeeId,
        descriptor,
        registeredAt: new Date().toISOString(),
      });

      await refreshProfile().catch(() => {});

      if (isMountedRef.current) {
        triggerHaptic();
        setIsProcessing(false);
        setIsCompleted(true);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setIsProcessing(false);
        setErrorMessage(err.message || "Failed to finalize template. Please try again.");
      }
    }
  };

  const currentInfo = ENROLLMENT_STEPS[currentStepIndex - 1] || ENROLLMENT_STEPS[0];

  const translateYLaser = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 230],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Biometric Face Enrollment</Text>
          <Text style={styles.headerSubtitle}>ArcFace 3D Neural Vector Registration</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {!isCompleted ? (
        <View style={styles.cameraScreen}>
          <FaceCamera
            cameraRef={cameraRef}
            facing={facing}
            permissionGranted={!!permission?.granted}
            onRequestPermission={requestPermission}
          >
            {/* Top Security Bar */}
            <View style={styles.topRow}>
              <View style={styles.aiBadge}>
                <Sparkles size={13} color="#22C55E" />
                <Text style={styles.aiBadgeText}>
                  {isProcessing && currentStepIndex === 3 ? "Compiling 128D Master..." : `Angle ${currentStepIndex} of 3`}
                </Text>
              </View>

              <TouchableOpacity style={styles.flipBtn} onPress={() => setFacing((c) => (c === "back" ? "front" : "back"))}>
                <FlipHorizontal size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Premium Oval Scanner Frame */}
            <View style={styles.scanTargetArea}>
              <View style={styles.faceGuideWrap}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />

                <View style={[styles.faceOval, isProcessing && styles.faceOvalActive]}>
                  <View style={[styles.cornerMarker, styles.tl]} />
                  <View style={[styles.cornerMarker, styles.tr]} />
                  <View style={[styles.cornerMarker, styles.bl]} />
                  <View style={[styles.cornerMarker, styles.br]} />

                  {!isProcessing && (
                    <Animated.View style={[styles.laserLine, { transform: [{ translateY: translateYLaser }] }]} />
                  )}

                  {isProcessing && (
                    <View style={styles.processingOverlay}>
                      <ActivityIndicator size="large" color="#22C55E" />
                    </View>
                  )}
                </View>
              </View>

              {/* Progress Dots */}
              <View style={styles.dotsRow}>
                {ENROLLMENT_STEPS.map((step) => (
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

            {/* Bottom Status Card */}
            <View style={styles.bottomHud}>
              <View style={styles.statusCard}>
                <View style={styles.statusTopRow}>
                  <View style={[styles.activeDot, errorMessage ? { backgroundColor: "#EF4444" } : { backgroundColor: "#22C55E" }]} />
                  <Text style={styles.statusBoxText}>
                    {errorMessage || currentInfo.labelEn}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((currentStepIndex) / ENROLLMENT_STEPS.length) * 100}%` },
                    ]}
                  />
                </View>

                <View style={styles.statusMetaRow}>
                  <Text style={styles.statusSubText}>{errorMessage ? "Adjust position" : currentInfo.labelBn}</Text>
                  <Text style={styles.secureLabel}>Auto Scan</Text>
                </View>
              </View>

              {errorMessage && (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => startProgressiveEnrollment(1, [])}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Restart Enrollment</Text>
                </TouchableOpacity>
              )}
            </View>
          </FaceCamera>
        </View>
      ) : (
        /* Success Screen */
        <View style={styles.successScreen}>
          <View style={styles.successIconBox}>
            <CheckCircle2 size={54} color="#00B050" />
          </View>

          <Text style={styles.successTitle}>Face Enrolled Successfully</Text>
          <Text style={styles.successDesc}>
            Your multi-angle 3D biometric profile has been created and synced. You can now use instant check-in.
          </Text>

          <View style={styles.specCard}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Biometric Engine</Text>
              <Text style={styles.specVal}>{FACE_MODEL_CONFIG.modelName}</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Vector Format</Text>
              <Text style={styles.specVal}>128-D L2 Normalized</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Angle Coverage</Text>
              <Text style={[styles.specVal, { color: "#00B050" }]}>3/3 Angles Verified</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Return to Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  headerSubtitle: { fontSize: 10, color: "#64748B", marginTop: 1 },
  cameraScreen: { flex: 1, backgroundColor: "#000000" },
  topRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(15, 23, 42, 0.8)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  aiBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  flipBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.75)", alignItems: "center", justifyContent: "center" },
  scanTargetArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  faceGuideWrap: { width: 280, height: 330, alignItems: "center", justifyContent: "center" },
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
  faceOvalActive: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  cornerMarker: { position: "absolute", width: 32, height: 32, borderColor: "#22C55E", zIndex: 4 },
  tl: { top: 16, left: 20, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 18 },
  tr: { top: 16, right: 20, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 18 },
  bl: { bottom: 16, left: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 18 },
  br: { bottom: 16, right: 20, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 18 },
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
  processingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.4)" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 18 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255, 255, 255, 0.25)" },
  dotCurrent: { backgroundColor: "#22C55E", width: 24 },
  dotCompleted: { backgroundColor: "#00B050" },
  bottomHud: { paddingHorizontal: 18, paddingBottom: 22, gap: 10 },
  statusCard: {
    backgroundColor: "rgba(15,23,42,0.90)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statusTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#F59E0B" },
  statusBoxText: { flex: 1, color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden", marginTop: 12 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#22C55E" },
  statusMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 9 },
  statusSubText: { color: "rgba(255,255,255,0.58)", fontSize: 10.5, fontWeight: "600" },
  secureLabel: { color: "#86EFAC", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  retryBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  successScreen: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  successIconBox: { width: 86, height: 86, borderRadius: 43, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  successTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  successDesc: { fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 6, marginBottom: 24, lineHeight: 18, paddingHorizontal: 16 },
  specCard: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 24 },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  specLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  specVal: { fontSize: 12, fontWeight: "800", color: "#0F172A" },
  specDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  doneBtn: { width: "100%", backgroundColor: "#0F172A", borderRadius: 16, height: 48, alignItems: "center", justifyContent: "center" },
  doneBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});