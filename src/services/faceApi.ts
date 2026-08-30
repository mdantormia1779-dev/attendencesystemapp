/**
 * Face Biometrics Backend API Client
 * Connects mobile app to backend /api/employee/face/* endpoints with authorization headers.
 */

import { apiRequest } from "../api/client";
import { FACE_MODEL_CONFIG } from "../constants/faceModel";
import { EmployeeFaceProfile, FaceVerificationResult } from "../types/face";

export interface RegisterFacePayload {
  employeeId: string;
  embedding: number[];
  sampleCount?: number;
  latitude?: number;
  longitude?: number;
}

export interface VerifyFacePayload {
  employeeId: string;
  probeEmbedding: number[];
  livenessPassed?: boolean;
  threshold?: number;
  latitude?: number;
  longitude?: number;
}

export const faceApi = {
  /**
   * Register enrolled ArcFace master embedding vector
   */
  async registerFace(data: RegisterFacePayload): Promise<{
    success: boolean;
    data?: EmployeeFaceProfile;
    message?: string;
  }> {
    if (!data.embedding || data.embedding.length !== FACE_MODEL_CONFIG.embeddingDimension) {
      console.warn(`[faceApi]: Invalid embedding vector length (${data.embedding?.length || 0}D)`);
      return { success: false, message: "Invalid biometric vector dimension" };
    }

    return apiRequest<EmployeeFaceProfile>("/api/employee/face/register", {
      method: "POST",
      body: {
        employeeId: data.employeeId,
        embedding: data.embedding,
        modelName: FACE_MODEL_CONFIG.modelName,
        modelVersion: FACE_MODEL_CONFIG.modelVersion,
        embeddingDimension: FACE_MODEL_CONFIG.embeddingDimension,
        sampleCount: data.sampleCount || FACE_MODEL_CONFIG.registrationSamplesRequired,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  },

  /**
   * Verify probe embedding on backend against employee's enrolled template
   */
  async verifyFace(data: VerifyFacePayload): Promise<{
    success: boolean;
    data?: FaceVerificationResult;
    message?: string;
  }> {
    if (!data.probeEmbedding || data.probeEmbedding.length !== FACE_MODEL_CONFIG.embeddingDimension) {
      console.warn(`[faceApi]: Invalid probe vector length (${data.probeEmbedding?.length || 0}D)`);
      return { success: false, message: "Invalid probe vector dimension" };
    }

    return apiRequest<FaceVerificationResult>("/api/employee/face/verify", {
      method: "POST",
      body: {
        employeeId: data.employeeId,
        probeEmbedding: data.probeEmbedding,
        livenessPassed: Boolean(data.livenessPassed),
        threshold: data.threshold || FACE_MODEL_CONFIG.defaultCosineThreshold,
        modelName: FACE_MODEL_CONFIG.modelName,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  },

  /**
   * Query employee face enrollment status
   */
  async getFaceStatus(employeeId: string): Promise<{
    success: boolean;
    data?: {
      isEnrolled: boolean;
      enrolledAt?: string;
      modelName?: string;
      sampleCount?: number;
    };
    message?: string;
  }> {
    return apiRequest(`/api/employee/face/status?employeeId=${encodeURIComponent(employeeId)}`, {
      method: "GET",
    });
  },

  /**
   * Delete / reset enrolled face template
   */
  async deleteFace(employeeId: string): Promise<{ success: boolean; message?: string }> {
    return apiRequest(`/api/employee/face?employeeId=${encodeURIComponent(employeeId)}`, {
      method: "DELETE",
    });
  },
};