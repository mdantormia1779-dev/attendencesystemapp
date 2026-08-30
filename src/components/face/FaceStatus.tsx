import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sparkles, ShieldCheck, AlertCircle } from "lucide-react-native";

interface FaceStatusProps {
  statusText: string;
  isAiActive?: boolean;
  livenessPassed?: boolean;
}

export const FaceStatus: React.FC<FaceStatusProps> = ({
  statusText,
  isAiActive = true,
  livenessPassed = false,
}) => {
  return (
    <View style={styles.badge}>
      {livenessPassed ? (
        <ShieldCheck size={13} color="#22C55E" />
      ) : (
        <Sparkles size={13} color="#22C55E" />
      )}
      <Text style={styles.text}>{statusText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
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
  text: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
