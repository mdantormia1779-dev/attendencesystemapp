/**
 * Face Image Preprocessing and Quality Verification for ArcFace ONNX Input
 * Model expects: 112x112 RGB Tensor, Normalized with (pixel - 127.5) / 128.0
 */

import { FACE_MODEL_CONFIG, FACE_DETECTION_CONFIG } from "../constants/faceModel";
import { FaceQualityMetrics } from "../types/face";

/**
 * Normalizes raw RGB pixel array [0..255] into ArcFace standard Float32Array [-1.0..1.0]
 */
export function normalizePixelsToArcFaceTensor(
  rawRgbPixels: Uint8Array | number[],
  targetWidth = FACE_MODEL_CONFIG.inputWidth,
  targetHeight = FACE_MODEL_CONFIG.inputHeight
): Float32Array {
  const pixelCount = targetWidth * targetHeight;
  const tensor = new Float32Array(3 * pixelCount); // NCHW format: [Channel, Height, Width]

  const [meanR, meanG, meanB] = FACE_MODEL_CONFIG.mean;
  const [stdR, stdG, stdB] = FACE_MODEL_CONFIG.std;

  const rOffset = 0 * pixelCount;
  const gOffset = 1 * pixelCount;
  const bOffset = 2 * pixelCount;

  for (let i = 0; i < pixelCount; i++) {
    const r = rawRgbPixels[i * 3 + 0] ?? 128;
    const g = rawRgbPixels[i * 3 + 1] ?? 128;
    const b = rawRgbPixels[i * 3 + 2] ?? 128;

    tensor[rOffset + i] = (r - meanR) / stdR;
    tensor[gOffset + i] = (g - meanG) / stdG;
    tensor[bOffset + i] = (b - meanB) / stdB;
  }

  return tensor;
}

/**
 * Validates face bounding box, position, head pose angles, and lighting condition
 */
export function validateFaceFrameQuality(
  faceBox: { x: number; y: number; width: number; height: number } | null,
  viewfinderWidth: number,
  viewfinderHeight: number,
  pose = { yaw: 0, pitch: 0, roll: 0 },
  lightingValue = 70
): FaceQualityMetrics {
  if (!faceBox) {
    return {
      faceDetected: false,
      multipleFacesDetected: false,
      isCentered: false,
      isSizeValid: false,
      lightingQuality: "GOOD",
      blurDetected: false,
      headPose: pose,
      guidanceMessage: "Position your face inside the frame (ফ্রেমের মাঝে মুখ রাখুন)",
      isReadyForInference: false,
    };
  }

  const faceRatio = faceBox.width / viewfinderWidth;
  const centerX = (faceBox.x + faceBox.width / 2) / viewfinderWidth;
  const centerY = (faceBox.y + faceBox.height / 2) / viewfinderHeight;

  const offsetX = Math.abs(centerX - 0.5);
  const offsetY = Math.abs(centerY - 0.48);

  const isTooSmall = faceRatio < FACE_DETECTION_CONFIG.minFaceSizeRatio;
  const isTooLarge = faceRatio > FACE_DETECTION_CONFIG.maxFaceSizeRatio;
  const isOffCenter = offsetX > FACE_DETECTION_CONFIG.centerToleranceX || offsetY > FACE_DETECTION_CONFIG.centerToleranceY;
  const isExtremePose = Math.abs(pose.yaw) > 25 || Math.abs(pose.pitch) > 20 || Math.abs(pose.roll) > 18;

  let guidance = "Hold still (সোজা তাকিয়ে থাকুন)";
  let isReady = true;

  if (isTooSmall) {
    guidance = "Move closer to camera (ক্যামেরার আরেকটু কাছে আসুন)";
    isReady = false;
  } else if (isTooLarge) {
    guidance = "Move slightly farther (ক্যামেরা থেকে সামান্য দূরে যান)";
    isReady = false;
  } else if (isOffCenter) {
    guidance = "Center your face in the oval guide (ফ্রেমের একদম মাঝে মুখ রাখুন)";
    isReady = false;
  } else if (isExtremePose) {
    guidance = "Look straight at the camera (সোজা ক্যামেরার দিকে তাকান)";
    isReady = false;
  } else if (lightingValue < 30) {
    guidance = "Improve lighting condition (পর্যাপ্ত আলোতে আসুন)";
    isReady = false;
  }

  return {
    faceDetected: true,
    multipleFacesDetected: false,
    isCentered: !isOffCenter,
    isSizeValid: !isTooSmall && !isTooLarge,
    lightingQuality: lightingValue < 30 ? "TOO_DARK" : "GOOD",
    blurDetected: false,
    headPose: pose,
    guidanceMessage: guidance,
    isReadyForInference: isReady,
  };
}
