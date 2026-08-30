import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Text } from "react-native";
import { Eye, CheckCircle2, ScanFace } from "lucide-react-native";

interface FaceGuideProps {
  status: "ALIGNING" | "BLINK_CHALLENGE" | "MATCHING" | "SUCCESS" | "ERROR";
  progress?: number; // 0 to 1
  instructionText?: string;
  isLiveMatched?: boolean;
}

export const FaceGuide: React.FC<FaceGuideProps> = ({
  status,
  progress = 0,
  instructionText,
  isLiveMatched = false,
}) => {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const eyeBlinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (status === "BLINK_CHALLENGE") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(eyeBlinkAnim, { toValue: 0.1, duration: 350, useNativeDriver: true }),
          Animated.timing(eyeBlinkAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.delay(900),
        ])
      ).start();
    }
  }, [status]);

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 240],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ovalFrame,
          isLiveMatched && styles.ovalSuccess,
          status === "ERROR" && styles.ovalError,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {/* Corner Brackets */}
        <View style={[styles.corner, styles.cTopLeft, isLiveMatched && styles.cSuccess]} />
        <View style={[styles.corner, styles.cTopRight, isLiveMatched && styles.cSuccess]} />
        <View style={[styles.corner, styles.cBottomLeft, isLiveMatched && styles.cSuccess]} />
        <View style={[styles.corner, styles.cBottomRight, isLiveMatched && styles.cSuccess]} />

        {/* Laser Sweep */}
        {!isLiveMatched && (
          <Animated.View
            style={[
              styles.laser,
              { transform: [{ translateY: laserTranslateY }] },
            ]}
          />
        )}

        {/* Center Interactive Prompts */}
        {status === "BLINK_CHALLENGE" && (
          <Animated.View style={[styles.centerBadge, { opacity: eyeBlinkAnim }]}>
            <Eye size={36} color="#00B050" />
            <Text style={styles.centerBadgeText}>Blink Eyes / পলক ফেলুন</Text>
          </Animated.View>
        )}

        {status === "MATCHING" && (
          <View style={styles.centerBadge}>
            <ScanFace size={34} color="#38BDF8" />
            <Text style={styles.centerBadgeText}>ArcFace ONNX Inference</Text>
          </View>
        )}

        {isLiveMatched && (
          <View style={styles.successBadge}>
            <CheckCircle2 size={44} color="#22C55E" />
            <Text style={styles.successBadgeText}>Match Confirmed</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ovalFrame: {
    width: 250,
    height: 270,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(0, 176, 80, 0.6)",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  ovalSuccess: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  ovalError: {
    borderColor: "#EF4444",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#00B050",
  },
  cSuccess: {
    borderColor: "#22C55E",
  },
  cTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  laser: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    height: 2,
    backgroundColor: "#00B050",
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  centerBadge: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#00B050",
  },
  centerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  successBadge: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#22C55E",
  },
  successBadgeText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
});
