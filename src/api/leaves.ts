import { apiRequest } from "./client";
import { LeaveRequest } from "../types";

export const leavesApi = {
  getLeaves: async (employeeId?: string) => {
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
    return apiRequest<LeaveRequest[]>(`/api/leaves${query}`);
  },

  apply: async (data: {
    employeeId: string;
    type: "CASUAL" | "SICK" | "ANNUAL" | "MATERNITY" | "UNPAID";
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    return apiRequest<LeaveRequest>("/api/leaves", {
      method: "POST",
      body: data,
    });
  },
};
