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
   * ফ্রেমের সাইজ ও পোজের ভিত্তিতে ফেস কোয়ালিটি যাচাই
   */
  public evaluateFrame(
    viewfinderWidth: number,
    viewfinderHeight: number,
    faceBounds?: BoundingBox | null,
    pose = { yaw: 0, pitch: 0, roll: 0 }
  ): FaceQualityMetrics {
    this.frameCount++;

    // মুখ ডিটেক্ট না হলে সেন্ট্রাল ফলব্যাক বক্স
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

    // হাত ও ক্যামেরার কাঁপুনির জন্য এক্সপোনেনশিয়াল স্মুথিং (Jitter Reduction)
    const activeBox = this.applySmoothing(faceBounds);
    const quality = validateFaceFrameQuality(activeBox, viewfinderWidth, viewfinderHeight, pose);
    this.lastQuality = quality;
    return quality;
  }

  /**
   * MediaPipe 468 3D ল্যান্ডমার্ক থেকে সরাসরি বাউন্ডিং বক্স ও পোজ গণনা
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
   * ফ্রেম জাম্প ও শিফটিং দূর করতে স্মুথিং ফিল্টার
   */
  private applySmoothing(newBox: BoundingBox): BoundingBox {
    if (!this.smoothedBox) {
      this.smoothedBox = newBox;
      return newBox;
    }

    const alpha = 0.65; // রেসপনসিভনেস ফ্যাক্টর
    this.smoothedBox = {
      x: this.smoothedBox.x * (1 - alpha) + newBox.x * alpha,
      y: this.smoothedBox.y * (1 - alpha) + newBox.y * alpha,
      width: this.smoothedBox.width * (1 - alpha) + newBox.width * alpha,
      height: this.smoothedBox.height * (1 - alpha) + newBox.height * alpha,
    };

    return this.smoothedBox;
  }

  /**
   * ক্যাপচার করার জন্য ফ্রেমটি উপযুক্ত কি না যাচাই
   */
  public isFrameReadyForCapture(quality: FaceQualityMetrics): boolean {
    return Boolean(
      quality.isCentered &&
      quality.isSizeValid &&
      quality.lightingScore >= FACE_DETECTION_CONFIG.minLightingScore &&
      quality.blurScore <= FACE_DETECTION_CONFIG.maxBlurScore
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