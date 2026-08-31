/**
 * Face Detection & Framing Quality Service
 * Real-time framing analyzer ensuring optimal face centering, lighting, and size before ArcFace ONNX inference.
 */

import { validateFaceFrameQuality } from "../utils/facePreprocessing";
import { FACE_DETECTION_CONFIG } from "../constants/faceModel";
import { FaceQualityMetrics } from "../types/face";
import { Point3D, calculateHeadPose } from "../utils/mediaPipeUtils";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

class FaceDetectionService {
  private frameCount = 0;
  private lastQuality: FaceQualityMetrics | null = null;
  private smoothedBox: BoundingBox | null = null;

  /**
   * Evaluates face frame quality based on size, centering, and head pose
   */
  public evaluateFrame(
    viewfinderWidth: number,
    viewfinderHeight: number,
    faceBounds?: BoundingBox | null,
    pose = { yaw: 0, pitch: 0, roll: 0 }
  ): FaceQualityMetrics {
    this.frameCount++;

    // Central fallback box when face bounds are not provided
    if (!faceBounds) {
      const fallbackBox: BoundingBox = {
        x: viewfinderWidth * 0.20,
        y: viewfinderHeight * 0.18,
        width: viewfinderWidth * 0.60,
        height: viewfinderHeight * 0.45,
      };

      const quality = validateFaceFrameQuality(fallbackBox, viewfinderWidth, viewfinderHeight, pose);
      this.lastQuality = quality;
      return quality;
    }

    // Exponential smoothing (Jitter Reduction) for camera / hand tremor
    const activeBox = this.applySmoothing(faceBounds);
    const quality = validateFaceFrameQuality(activeBox, viewfinderWidth, viewfinderHeight, pose);
    this.lastQuality = quality;
    return quality;
  }

  /**
   * Calculates bounding box and pose directly from MediaPipe 468 3D landmarks
   */
  public evaluateLandmarks(
    landmarks: Point3D[],
    viewfinderWidth: number,
    viewfinderHeight: number
  ): FaceQualityMetrics {
    if (!landmarks || landmarks.length === 0) {
      return this.evaluateFrame(viewfinderWidth, viewfinderHeight, null);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const box: BoundingBox = {
      x: minX * viewfinderWidth,
      y: minY * viewfinderHeight,
      width: (maxX - minX) * viewfinderWidth,
      height: (maxY - minY) * viewfinderHeight,
    };

    const { yaw, pitch } = calculateHeadPose(landmarks);
    const pose = { yaw: (yaw - 1.0) * 45, pitch: (pitch - 0.5) * 40, roll: 0 };

    return this.evaluateFrame(viewfinderWidth, viewfinderHeight, box, pose);
  }

  /**
   * Smoothing filter to eliminate frame jumps and optical shifting
   */
  private applySmoothing(newBox: BoundingBox): BoundingBox {
    if (!this.smoothedBox) {
      this.smoothedBox = newBox;
      return newBox;
    }

    const alpha = 0.65; // Responsiveness factor
    this.smoothedBox = {
      x: this.smoothedBox.x * (1 - alpha) + newBox.x * alpha,
      y: this.smoothedBox.y * (1 - alpha) + newBox.y * alpha,
      width: this.smoothedBox.width * (1 - alpha) + newBox.width * alpha,
      height: this.smoothedBox.height * (1 - alpha) + newBox.height * alpha,
    };

    return this.smoothedBox;
  }

  /**
   * Verifies if the frame meets capture quality requirements
   */
  public isFrameReadyForCapture(quality: FaceQualityMetrics): boolean {
    return Boolean(
      quality.isCentered &&
      quality.isSizeValid &&
      quality.lightingQuality === "GOOD" &&
      !quality.blurDetected
    );
  }


  public getLastQuality(): FaceQualityMetrics | null {
    return this.lastQuality;
  }

  public reset(): void {
    this.frameCount = 0;
    this.lastQuality = null;
    this.smoothedBox = null;
  }
}

export const faceDetectionService = new FaceDetectionService();