/**
 * Biometric Embedding Vector Validation & Serialization Utilities
 */

import { FACE_MODEL_CONFIG } from "../constants/faceModel";

export function isEmbeddingValid(embedding?: number[] | null, expectedDim = FACE_MODEL_CONFIG.embeddingDimension): boolean {
  if (!embedding || !Array.isArray(embedding)) return false;
  if (embedding.length !== expectedDim) return false;

  for (let i = 0; i < embedding.length; i++) {
    const val = embedding[i];
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
      return false;
    }
  }
  return true;
}

export function sanitizeEmbeddingVector(vector: number[]): number[] {
  return vector.map((v) => {
    if (isNaN(v) || !isFinite(v)) return 0;
    return parseFloat(v.toFixed(6));
  });
}
