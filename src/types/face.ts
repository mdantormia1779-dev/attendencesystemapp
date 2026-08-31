/**
 * Biometric Face Verification & ArcFace ONNX Types
 */

export type FaceRegistrationState =
  | "CHECKING_STATUS"
  | "ALREADY_REGISTERED"
  | "NO_FACE"
  | "FACE_DETECTED"
  | "MULTIPLE_FACES"
  | "FACE_TOO_SMALL"
  | "FACE_TOO_LARGE"
  | "FACE_OFF_CENTER"
  | "FACE_POOR_QUALITY"
  | "FACE_READY"
  | "CAPTURING"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR";

export type FaceVerificationState =
  | "IDLE"
  | "FACE_DETECTED"
  | "CHALLENGE_STARTED"
  | "CHALLENGE_PROGRESS"
  | "LIVENESS_PASSED"
  | "FACE_CAPTURE_READY"
  | "EMBEDDING_GENERATED"
  | "IDENTITY_CHECK"
  | "VERIFIED"
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "LIVENESS_FAILED"
  | "LIVENESS_TIMEOUT"
  | "POOR_QUALITY"
  | "IDENTITY_NOT_MATCHED"
  | "NO_REGISTERED_FACE"
  | "MODEL_ERROR"
  | "NETWORK_ERROR";

export type LivenessChallengeType =
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "LOOK_UP"
  | "LOOK_DOWN"
  | "BLINK";

export interface FaceBoundingBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
  mouthLeft: { x: number; y: number };
  mouthRight: { x: number; y: number };
}

export interface FaceQualityMetrics {
  faceDetected: boolean;
  multipleFacesDetected: boolean;
  isCentered: boolean;
  isSizeValid: boolean;
  lightingQuality: "GOOD" | "TOO_DARK" | "TOO_BRIGHT";
  lightingScore?: number;
  blurDetected: boolean;
  blurScore?: number;
  headPose: {
    yaw: number;   // Left-right angle (-90 to +90)
    pitch: number; // Up-down angle (-90 to +90)
    roll: number;  // Tilt angle (-90 to +90)
  };
  guidanceMessage: string;
  isReadyForInference: boolean;
}


export type FaceQuality = FaceQualityMetrics;

export interface LivenessChallenge {
  type: LivenessChallengeType;
  promptBangla: string;
  promptEnglish: string;
  timeoutMs: number;
  completed: boolean;
}

export interface LivenessResult {
  passed: boolean;
  challengeType: LivenessChallengeType;
  opticalTransitionDetected: boolean;
  motionScore: number;
  elapsedMs: number;
  failureReason?: string;
}

export interface FaceEmbeddingResult {
  embedding: number[]; // 128-dimensional Float32 vector
  isNormalized: boolean;
  inferenceDurationMs: number;
  qualityScore: number;
}

export interface EmployeeFaceProfile {
  id: string;
  employeeId: string;
  embedding: number[];
  modelName: string;
  modelVersion: string;
  embeddingDimension: number;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaceProfileStatus {
  isEnrolled: boolean;
  enrolledAt?: string;
  modelName?: string;
  sampleCount?: number;
}

export interface FaceVerificationResult {
  matched: boolean;
  similarity: number;        // Cosine similarity [-1.0 to 1.0]
  euclideanDistance: number; // Euclidean distance
  threshold: number;         // Configurable threshold (e.g. 0.68)
  liveness: LivenessResult;
  verifiedAt: string;
}

export interface VerificationHandoverResult {
  verified: boolean;
  livenessPassed: boolean;
  similarity: number;
  threshold: number;
  reason:
    | "VERIFIED"
    | "FACE_NOT_FOUND"
    | "MULTIPLE_FACES"
    | "LIVENESS_FAILED"
    | "LIVENESS_TIMEOUT"
    | "FACE_NOT_MATCHED"
    | "NO_REGISTERED_FACE"
    | "MODEL_ERROR"
    | "NETWORK_ERROR";
}

export interface FaceRegistrationSample {
  sampleIndex: number;
  embedding: number[];
  poseTag: "CENTER" | "SLIGHT_LEFT" | "SLIGHT_RIGHT" | "SLIGHT_UP" | "SLIGHT_DOWN";
  qualityScore: number;
  capturedAt: number;
}

export type FaceSample = FaceRegistrationSample;

export interface FaceRegistrationResult {
  success: boolean;
  employeeId: string;
  aggregatedEmbedding: number[];
  sampleCount: number;
  message: string;
  registeredAt: string;
}
