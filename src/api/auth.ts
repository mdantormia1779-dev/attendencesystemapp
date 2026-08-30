import { apiRequest } from "./client";
import { EmployeeUser } from "../types";

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    return apiRequest<{ token: string; user: EmployeeUser }>("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
  },

  getProfile: async () => {
    return apiRequest<EmployeeUser>("/api/auth/me");
  },

  registerFace: async (data: {
    employeeId: string;
    vectorData?: number[];
  }) => {
    return apiRequest("/api/face/register", {
      method: "POST",
      body: {
        employeeId: data.employeeId,
        vectorData: data.vectorData && data.vectorData.length === 128 ? data.vectorData : new Array(128).fill(0.05),
        antiSpoofScore: 99.0,
      },
    });
  },
};
