import { Point3D, calculateEAR, calculateHeadPose } from "../utils/mediaPipeUtils";

export interface LivenessStatus {
  isLive: boolean;
  actionCompleted: boolean;
  score: number;
  message: string;
}

export class MediaPipeLivenessValidator {
  private blinkHistory: number[] = [];
  private static BLINK_CLOSED_THRESHOLD = 0.19; // EAR < 0.19 considered closed
  private static BLINK_OPEN_THRESHOLD = 0.26;   // EAR > 0.26 considered open

  /**
   * Evaluates natural eye blink using Eye Aspect Ratio (EAR) state tracking
   */
  public validateBlink(landmarks: Point3D[]): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const ear = calculateEAR(landmarks);
    this.blinkHistory.push(ear);
    if (this.blinkHistory.length > 12) this.blinkHistory.shift();

    // Verify eye was open in preceding frames
    const wasOpen = this.blinkHistory.slice(0, 6).some((val) => val >= MediaPipeLivenessValidator.BLINK_OPEN_THRESHOLD);
    // Verify eye is closed in current frame
    const isClosedNow = ear <= MediaPipeLivenessValidator.BLINK_CLOSED_THRESHOLD;

    return wasOpen && isClosedNow;
  }

  /**
   * Tracks left/right head turn using horizontal angle (Yaw)
   */
  public validateHeadTurn(landmarks: Point3D[], direction: "LEFT" | "RIGHT"): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const { yaw } = calculateHeadPose(landmarks);
    if (direction === "LEFT") return yaw > 1.45;
    if (direction === "RIGHT") return yaw < 0.68;
    return false;
  }

  /**
   * Tracks up/down head pitch using vertical angle
   */
  public validateVerticalTilt(landmarks: Point3D[], direction: "UP" | "DOWN"): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const { pitch } = calculateHeadPose(landmarks);
    if (direction === "UP") return pitch < 0.38;
    if (direction === "DOWN") return pitch > 0.62;
    return false;
  }

  /**
   * Analyzes 3D face mesh depth variance (Z-Axis) to prevent 2D screen & photo spoofing
   */
  public validate3DDepth(landmarks: Point3D[]): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const noseZ = landmarks[1].z;
    const leftCheekZ = landmarks[234].z;
    const rightCheekZ = landmarks[454].z;

    const depthVariance = Math.abs(noseZ - (leftCheekZ + rightCheekZ) / 2);
    // Flat 2D screen or paper displays have near zero Z-depth variance
    return depthVariance > 0.02;
  }

  /**
   * Clears state history upon session completion
   */
  public reset(): void {
    this.blinkHistory = [];
  }
}

export const mediaPipeLiveness = new MediaPipeLivenessValidator();