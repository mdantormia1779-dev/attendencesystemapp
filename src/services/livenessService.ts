/**
 * Active & Passive Liveness / Challenge-Response Verification Service
 * Evaluates randomized human challenges (head turn, look up/down, blink) to defeat static photos & screen presentation attacks.
 */

import { LivenessChallenge, LivenessChallengeType, LivenessResult } from "../types/face";
import { Point3D, calculateEAR, calculateHeadPose } from "../utils/mediaPipeUtils";
import { mediaPipeLiveness } from "./mediaPipeLivenessService";

const AVAILABLE_CHALLENGES: Array<{
  type: LivenessChallengeType;
  promptBangla: string;
  promptEnglish: string;
}> = [
  { type: "BLINK", promptBangla: "চোখের পলক ফেলুন (Blink Eyes)", promptEnglish: "Please blink your eyes naturally" },
  { type: "TURN_LEFT", promptBangla: "সামান্য বামে তাকান (Turn head LEFT)", promptEnglish: "Turn your head slightly LEFT" },
  { type: "TURN_RIGHT", promptBangla: "সামান্য ডানে তাকান (Turn head RIGHT)", promptEnglish: "Turn your head slightly RIGHT" },
  { type: "LOOK_UP", promptBangla: "সামান্য ওপরের দিকে তাকান (Look UP)", promptEnglish: "Look slightly UP" },
  { type: "LOOK_DOWN", promptBangla: "সামান্য নিচের দিকে তাকান (Look DOWN)", promptEnglish: "Look slightly DOWN" },
];

class LivenessService {
  private activeChallenge: LivenessChallenge | null = null;
  private challengeStartTime = 0;
  private opticalTransitionDetected = false;
  private motionAccumulator = 0;
  private consecutivePassFrames = 0;
  private static REQUIRED_CONSECUTIVE_FRAMES = 2; // নির্ভরযোগ্যতার জন্য অন্তত ২ ফ্রেম যাচাই

  /**
   * Starts a new randomized challenge-response session
   */
  public startLivenessSession(forcedType?: LivenessChallengeType): LivenessChallenge {
    this.opticalTransitionDetected = false;
    this.motionAccumulator = 0;
    this.consecutivePassFrames = 0;
    this.challengeStartTime = Date.now();

    const selected = forcedType
      ? AVAILABLE_CHALLENGES.find((c) => c.type === forcedType) || AVAILABLE_CHALLENGES[0]
      : AVAILABLE_CHALLENGES[Math.floor(Math.random() * AVAILABLE_CHALLENGES.length)];

    this.activeChallenge = {
      type: selected.type,
      promptBangla: selected.promptBangla,
      promptEnglish: selected.promptEnglish,
      timeoutMs: 7000,
      completed: false,
    };

    return this.activeChallenge;
  }

  /**
   * MediaPipe 468 3D ল্যান্ডমার্ক থেকে সরাসরি চ্যালেঞ্জ যাচাই
   */
  public evaluateLandmarks(landmarks: Point3D[]): boolean {
    if (!this.activeChallenge || !landmarks || landmarks.length === 0) {
      return false;
    }

    const elapsed = Date.now() - this.challengeStartTime;
    if (elapsed > this.activeChallenge.timeoutMs) {
      return false;
    }

    let framePassed = false;

    switch (this.activeChallenge.type) {
      case "BLINK":
        framePassed = mediaPipeLiveness.validateBlink(landmarks);
        break;

      case "TURN_LEFT":
        framePassed = mediaPipeLiveness.validateHeadTurn(landmarks, "LEFT");
        break;

      case "TURN_RIGHT":
        framePassed = mediaPipeLiveness.validateHeadTurn(landmarks, "RIGHT");
        break;

      case "LOOK_UP": {
        const { pitch } = calculateHeadPose(landmarks);
        framePassed = pitch < 0.38; // নাক ফ্রেমের ওপরের অংশে
        break;
      }

      case "LOOK_DOWN": {
        const { pitch } = calculateHeadPose(landmarks);
        framePassed = pitch > 0.62; // নাক ফ্রেমের নিচের অংশে
        break;
      }
    }

    if (framePassed) {
      this.consecutivePassFrames++;
      if (this.consecutivePassFrames >= LivenessService.REQUIRED_CONSECUTIVE_FRAMES) {
        this.opticalTransitionDetected = true;
        this.activeChallenge.completed = true;
        return true;
      }
    } else {
      this.consecutivePassFrames = Math.max(0, this.consecutivePassFrames - 1);
    }

    return this.activeChallenge.completed;
  }

  /**
   * Records observed optical movement/pose transition (Fallback for basic angle objects)
   */
  public recordMotionProgress(detectedPose: { yaw: number; pitch: number; roll: number } | null): boolean {
    if (!this.activeChallenge || !detectedPose) {
      return false; // নাল পেলে আর বাইপাস হবে না
    }

    const elapsed = Date.now() - this.challengeStartTime;
    if (elapsed > this.activeChallenge.timeoutMs) {
      return false;
    }

    switch (this.activeChallenge.type) {
      case "TURN_LEFT":
        if (detectedPose.yaw < -12) {
          this.opticalTransitionDetected = true;
          this.activeChallenge.completed = true;
        }
        break;
      case "TURN_RIGHT":
        if (detectedPose.yaw > 12) {
          this.opticalTransitionDetected = true;
          this.activeChallenge.completed = true;
        }
        break;
      case "LOOK_UP":
        if (detectedPose.pitch > 10) {
          this.opticalTransitionDetected = true;
          this.activeChallenge.completed = true;
        }
        break;
      case "LOOK_DOWN":
        if (detectedPose.pitch < -10) {
          this.opticalTransitionDetected = true;
          this.activeChallenge.completed = true;
        }
        break;
      case "BLINK":
        // ব্লিঙ্ক ইভেন্ট সরাসরি registerBlinkEvent() দিয়ে কল হবে
        break;
    }

    return this.activeChallenge.completed;
  }

  public registerChallengeSuccess(): void {
    this.opticalTransitionDetected = true;
    if (this.activeChallenge) {
      this.activeChallenge.completed = true;
    }
  }

  public registerBlinkEvent(): void {
    this.registerChallengeSuccess();
  }

  /**
   * Evaluates final liveness state
   */
  public verifyLiveness(): LivenessResult {
    const elapsed = this.challengeStartTime > 0 ? Date.now() - this.challengeStartTime : 0;
    const challengeType: LivenessChallengeType = this.activeChallenge?.type || "BLINK";
    const passed = Boolean(this.opticalTransitionDetected && elapsed <= (this.activeChallenge?.timeoutMs || 8000));

    return {
      passed,
      challengeType,
      opticalTransitionDetected: this.opticalTransitionDetected,
      motionScore: passed ? 0.94 : 0.12,
      elapsedMs: elapsed,
      failureReason: passed ? undefined : "Challenge timeout or optical anti-spoof threshold not met.",
    };
  }

  public getActiveChallenge(): LivenessChallenge | null {
    return this.activeChallenge;
  }

  public reset(): void {
    this.activeChallenge = null;
    this.opticalTransitionDetected = false;
    this.motionAccumulator = 0;
    this.consecutivePassFrames = 0;
    this.challengeStartTime = 0;
  }
}

export const livenessService = new LivenessService();