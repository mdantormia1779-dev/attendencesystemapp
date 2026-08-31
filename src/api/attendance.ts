import { apiRequest } from "./client";
import { AttendancePunch } from "../types";

export const attendanceApi = {
  getAttendanceLogs: async (employeeId?: string, date?: string) => {
    let query = "";
    const params: string[] = [];
    if (employeeId) params.push(`employeeId=${encodeURIComponent(employeeId)}`);
    if (date) params.push(`date=${encodeURIComponent(date)}`);
    if (params.length > 0) query = `?${params.join("&")}`;

    return apiRequest<any[]>(`/api/attendance${query}`);
  },

  getTodayStatus: async (employeeId?: string) => {
    let query = "";
    if (employeeId) query = `?employeeId=${encodeURIComponent(employeeId)}`;
    return apiRequest<any>(`/api/attendance/today${query}`);
  },

  checkIn: async (data: {
    employeeId: string;
    latitude: number;
    longitude: number;
    verificationMethod?: "FACE_RECOGNITION" | "GPS_GEOFENCE" | "BIOMETRIC_DEVICE" | "MANUAL_OVERRIDE";
    faceVector?: number[];
  }) => {
    return apiRequest<any>("/api/attendance/check-in", {
      method: "POST",
      body: {
        employeeId: data.employeeId,
        latitude: data.latitude,
        longitude: data.longitude,
        verificationMethod: data.verificationMethod || "GPS_GEOFENCE",
      },
    });
  },

  checkOut: async (data: {
    employeeId: string;
    latitude: number;
    longitude: number;
    verificationMethod?: "FACE_RECOGNITION" | "GPS_GEOFENCE" | "BIOMETRIC_DEVICE" | "MANUAL_OVERRIDE";
  }) => {
    return apiRequest<any>("/api/attendance/check-out", {
      method: "POST",
      body: {
        employeeId: data.employeeId,
        latitude: data.latitude,
        longitude: data.longitude,
        verificationMethod: data.verificationMethod || "GPS_GEOFENCE",
      },
    });
  },
};

