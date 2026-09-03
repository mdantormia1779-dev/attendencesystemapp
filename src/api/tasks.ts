import { apiRequest } from "./client";
import { TaskItem } from "../types";

export const tasksApi = {
  getTasks: async (params?: {
    employeeId?: string;
    status?: string;
    priority?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== "ALL") searchParams.append(k, v);
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<TaskItem[]>(`/api/tasks${query}`);
  },

  getTaskById: async (taskId: string) => {
    return apiRequest<TaskItem>(`/api/tasks/${taskId}`);
  },

  updateTask: async (
    taskId: string,
    data: {
      status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      completionNotes?: string | null;
      title?: string;
      description?: string;
      priority?: string;
    }
  ) => {
    return apiRequest<TaskItem>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: data,
    });
  },

  createTask: async (data: {
    employeeId: string;
    title: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate?: string;
    startDate?: string;
  }) => {
    return apiRequest<TaskItem>("/api/tasks", {
      method: "POST",
      body: data,
    });
  },

  getStats: async () => {
    return apiRequest<{
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      overdue: number;
    }>("/api/tasks/stats");
  },
};
