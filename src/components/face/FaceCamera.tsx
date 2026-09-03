import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { CameraView, CameraType } from "expo-camera";
import { Camera as CameraIcon } from "lucide-react-native";

interface FaceCameraProps {
  cameraRef: React.RefObject<any> | React.MutableRefObject<any>;
  facing: CameraType;
  onToggleFacing?: () => void;
  permissionGranted: boolean;
  onRequestPermission: () => void;
  children?: React.ReactNode;
}

export const FaceCamera: React.FC<FaceCameraProps> = ({
  cameraRef,
  facing,
  onToggleFacing,
  permissionGranted,
  onRequestPermission,
  children,
}) => {
  const [isCameraReady, setIsCameraReady] = useState(false);

  if (!permissionGranted) {
    return (
      <View style={styles.noPermBox}>
        <View style={styles.iconCircle}>
          <CameraIcon size={36} color="#00B050" />
        </View>
        <Text style={styles.noPermTitle}>Camera Permission Required</Text>
        <Text style={styles.noPermDesc}>
          Front camera access is required for touchless ArcFace biometric face recognition.
        </Text>
        <TouchableOpacity style={styles.grantBtn} onPress={onRequestPermission} activeOpacity={0.85}>
          <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="picture"
        enableTorch={false}
        mute={true}
        animateShutter={false}
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Camera Initializing Loader */}
      {!isCameraReady && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#00B050" />
          <Text style={styles.loaderText}>Initializing Face Sensor...</Text>
        </View>
      )}

      {/* Overlay UI (HUD, Scan Line, Buttons) */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 1,
  },
  loaderText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
    padding: 20,
    zIndex: 2,
  },
  noPermBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#0F172A",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 176, 80, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 176, 80, 0.25)",
  },
  noPermTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  noPermDesc: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  grantBtn: {
    backgroundColor: "#00B050",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  grantBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
});