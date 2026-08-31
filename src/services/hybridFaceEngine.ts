import { Point3D } from "../utils/mediaPipeUtils";
import { mediaPipeLiveness } from "./mediaPipeLivenessService";
import { faceRecognitionService } from "./faceRecognitionService";
import { FACE_MODEL_CONFIG } from "../constants/faceModel";

export interface HybridVerificationResult {
  verified: boolean;
  livenessPassed: boolean;
  similarity: number;
  embedding: number[];
  reason?: "VERIFIED" | "LIVENESS_FAILED" | "FACE_NOT_MATCHED" | "INVALID_DATA";
}

export async function processHybridVerification(
  landmarks: Point3D[],
  photoUri?: string,
  base64Image?: string,
  registeredEmbedding?: number[],
  requiredChallenge: "BLINK" | "HEAD_LEFT" | "HEAD_RIGHT" = "BLINK",
  customThreshold: number = FACE_MODEL_CONFIG.defaultCosineThreshold
): Promise<HybridVerificationResult> {
  // 1. Input data validation
  if (!registeredEmbedding || registeredEmbedding.length !== FACE_MODEL_CONFIG.embeddingDimension) {
    return {
      verified: false,
      livenessPassed: false,
      similarity: 0,
      embedding: [],
      reason: "INVALID_DATA",
    };
  }

  // 2. Google MediaPipe Liveness Verification
  let livenessPassed = false;
  if (landmarks && landmarks.length > 0) {
    if (requiredChallenge === "BLINK") {
      livenessPassed = mediaPipeLiveness.validateBlink(landmarks);
    } else if (requiredChallenge === "HEAD_LEFT") {
      livenessPassed = mediaPipeLiveness.validateHeadTurn(landmarks, "LEFT");
    } else if (requiredChallenge === "HEAD_RIGHT") {
      livenessPassed = mediaPipeLiveness.validateHeadTurn(landmarks, "RIGHT");
    }
  } else {
    // If no landmarks available, evaluate based on safety config
    livenessPassed = false;
  }

  // 3. Extract ArcFace 128D Embedding Vector
  const probe = await faceRecognitionService.generateFaceEmbedding(
    photoUri,
    undefined,
    base64Image
  );

  // 4. Compute Cosine Similarity Comparison
  const matchResult = faceRecognitionService.compareFaceEmbeddings(
    probe.embedding,
    registeredEmbedding,
    customThreshold
  );

  const isVerified = matchResult.matched && livenessPassed;

  return {
    verified: isVerified,
    livenessPassed,
    similarity: matchResult.similarity,
    embedding: probe.embedding,
    reason: isVerified
      ? "VERIFIED"
      : !livenessPassed
      ? "LIVENESS_FAILED"
      : "FACE_NOT_MATCHED",
  };
}