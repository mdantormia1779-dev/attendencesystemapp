import { Point3D, calculateEAR, calculateHeadPose } from "../utils/mediaPipeUtils";

export interface LivenessStatus {
  isLive: boolean;
  actionCompleted: boolean;
  score: number;
  message: string;
}

export class MediaPipeLivenessValidator {
  private blinkHistory: number[] = [];
  private static BLINK_CLOSED_THRESHOLD = 0.19; // EAR < 0.19 হলে চোখ বন্ধ ধরা হয়
  private static BLINK_OPEN_THRESHOLD = 0.26;   // EAR > 0.26 হলে চোখ খোলা ধরা হয়

  /**
   * Eye Aspect Ratio (EAR) স্টেট ট্র্যাকিং দিয়ে স্বাভাবিক চোখের পলক যাচাই
   */
  public validateBlink(landmarks: Point3D[]): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const ear = calculateEAR(landmarks);
    this.blinkHistory.push(ear);
    if (this.blinkHistory.length > 12) this.blinkHistory.shift();

    // পূর্বের ফ্রেমগুলোতে চোখ খোলা থাকার রেকর্ড
    const wasOpen = this.blinkHistory.slice(0, 6).some((val) => val >= MediaPipeLivenessValidator.BLINK_OPEN_THRESHOLD);
    // বর্তমান ফ্রেমে চোখ বন্ধ হওয়া
    const isClosedNow = ear <= MediaPipeLivenessValidator.BLINK_CLOSED_THRESHOLD;

    return wasOpen && isClosedNow;
  }

  /**
   * মাথার কোণ (Yaw) যাচাই করে ডানে/বামে ঘোরানো ট্র্যাকিং
   */
  public validateHeadTurn(landmarks: Point3D[], direction: "LEFT" | "RIGHT"): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const { yaw } = calculateHeadPose(landmarks);
    if (direction === "LEFT") return yaw > 1.45;
    if (direction === "RIGHT") return yaw < 0.68;
    return false;
  }

  /**
   * মাথার উলম্ব কোণ (Pitch) যাচাই করে উপরে/নিচে তাকানো ট্র্যাকিং
   */
  public validateVerticalTilt(landmarks: Point3D[], direction: "UP" | "DOWN"): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const { pitch } = calculateHeadPose(landmarks);
    if (direction === "UP") return pitch < 0.38;
    if (direction === "DOWN") return pitch > 0.62;
    return false;
  }

  /**
   * ৩ডি ফেস মেশের গভীরতা (Z-Axis Depth Variance) বিশ্লেষণ করে ২ডি স্ক্রিন/ফটো অ্যাটাক প্রতিরোধ
   */
  public validate3DDepth(landmarks: Point3D[]): boolean {
    if (!landmarks || landmarks.length < 468) return false;

    const noseZ = landmarks[1].z;
    const leftCheekZ = landmarks[234].z;
    const rightCheekZ = landmarks[454].z;

    const depthVariance = Math.abs(noseZ - (leftCheekZ + rightCheekZ) / 2);
    // ফ্ল্যাট স্ক্রিন বা কাগজের ছবিতে Z-অক্ষের পার্থক্য প্রায় শূন্য থাকে
    return depthVariance > 0.02;
  }

  /**
   * সেশন শেষে হিস্ট্রি ক্লিয়ার করা
   */
  public reset(): void {
    this.blinkHistory = [];
  }
}

export const mediaPipeLiveness = new MediaPipeLivenessValidator();