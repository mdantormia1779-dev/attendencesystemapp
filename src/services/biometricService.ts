import * as LocalAuthentication from "expo-local-authentication";
import { Platform, Vibration } from "react-native";

export interface BiometricStatus {
  isHardwareAvailable: boolean;
  isEnrolled: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  typeLabel: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

class BiometricService {
  /**
   * Check if device has biometric hardware and whether the user has registered biometrics (Fingerprint/FaceID)
   */
  async checkBiometricAvailability(): Promise<BiometricStatus> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
      const types = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];

      let label = "Fingerprint / Biometric Sensor";
      if (
        types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) &&
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        label = Platform.OS === "ios" ? "Face ID / Touch ID" : "Fingerprint & Face Unlock";
      } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        label = Platform.OS === "ios" ? "Face ID" : "Facial Recognition";
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        label = Platform.OS === "ios" ? "Touch ID" : "Fingerprint Scanner";
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        label = "Iris Scanner";
      }

      return {
        isHardwareAvailable: hasHardware,
        isEnrolled,
        biometricTypes: types,
        typeLabel: label,
      };
    } catch (e: any) {
      console.log("[BiometricService] Availability check error:", e);
      return {
        isHardwareAvailable: false,
        isEnrolled: false,
        biometricTypes: [],
        typeLabel: "Fingerprint Scanner",
      };
    }
  }

  /**
   * Prompt device biometric authentication (Fingerprint / TouchID / FaceID)
   */
  async authenticateBiometric(
    promptMessage = "Scan your fingerprint to record attendance"
  ): Promise<BiometricAuthResult> {
    try {
      const status = await this.checkBiometricAvailability();

      if (!status.isHardwareAvailable) {
        return {
          success: false,
          error: "Biometric sensor hardware is not available on this device.",
        };
      }

      if (!status.isEnrolled) {
        return {
          success: false,
          error: "No fingerprint or biometric credentials found. Please set up fingerprint in your device Settings.",
        };
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: "Cancel",
        fallbackLabel: "Use PIN / Password",
        disableDeviceFallback: false,
      });

      if (authResult.success) {
        // Trigger short success haptic
        try {
          if (Platform.OS === "android") {
            Vibration.vibrate([0, 35, 25, 35]);
          } else {
            Vibration.vibrate(35);
          }
        } catch {}

        return { success: true };
      }

      if (authResult.error === "user_cancel" || authResult.error === "app_cancel") {
        return {
          success: false,
          error: "Biometric verification was cancelled.",
        };
      }

      return {
        success: false,
        error: authResult.error || "Biometric authentication failed. Please try again.",
        warning: authResult.warning,
      };
    } catch (err: any) {
      console.log("[BiometricService] Auth error:", err);
      return {
        success: false,
        error: err?.message || "Biometric verification encountered an error.",
      };
    }
  }
}

export const biometricService = new BiometricService();
