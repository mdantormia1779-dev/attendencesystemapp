import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface FaceInstructionProps {
  primaryText: string;
  secondaryText?: string;
  isSuccess?: boolean;
  isWarning?: boolean;
}

export const FaceInstruction: React.FC<FaceInstructionProps> = ({
  primaryText,
  secondaryText,
  isSuccess = false,
  isWarning = false,
}) => {
  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.primary,
          isSuccess && styles.textSuccess,
          isWarning && styles.textWarning,
        ]}
      >
        {primaryText}
      </Text>
      {secondaryText ? (
        <Text style={styles.secondary}>{secondaryText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 16,
    width: "100%",
  },
  primary: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  secondary: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
    textAlign: "center",
  },
  textSuccess: {
    color: "#4ADE80",
  },
  textWarning: {
    color: "#FBBF24",
  },
});
