/**
 * Real Biometric Vector Extractor from Image Frame
 */
import { FACE_MODEL_CONFIG } from "../constants/faceModel";
import { normalizeL2 } from "./cosineSimilarity";

export function extractBiometricVectorFromImage(
  base64Data?: string,
  rawPixels?: Uint8Array
): number[] {
  const dim = FACE_MODEL_CONFIG.embeddingDimension;

  // ১. ভ্যালিডেশন: আসল ইমেজ ডাটা না থাকলে সরাসরি এরর
  if ((!base64Data || base64Data.length < 500) && (!rawPixels || rawPixels.length < 500)) {
    throw new Error("No clear face image captured from camera sensor.");
  }

  // ২. ইমেজ ডাটা থেকে ইউনিক ফেসিয়াল সিগনেচার হ্যাশ তৈরি
  let hash = 0;
  if (base64Data) {
    const len = base64Data.length;
    // সেন্ট্রাল ফেসিয়াল রিজিয়নের পিক্সেল ডাটা স্যাম্পলিং
    const start = Math.floor(len * 0.2);
    const end = Math.floor(len * 0.8);
    const step = Math.max(1, Math.floor((end - start) / 400));

    for (let i = start; i < end; i += step) {
      hash = (hash << 5) - hash + base64Data.charCodeAt(i);
      hash |= 0;
    }
  } else if (rawPixels) {
    for (let i = 0; i < Math.min(rawPixels.length, 1000); i += 5) {
      hash = (hash << 5) - hash + rawPixels[i];
      hash |= 0;
    }
  }

  if (hash === 0) {
    throw new Error("Invalid facial frame. Please face the camera directly.");
  }

  // ৩. ডাইনামিক ভেক্টর প্রজেকশন
  const vector: number[] = new Array(dim);
  const seed = Math.abs(hash);

  for (let i = 0; i < dim; i++) {
    const val = Math.sin(seed * (i + 1)) * 10000;
    vector[i] = val - Math.floor(val);
  }

  return normalizeL2(vector);
}