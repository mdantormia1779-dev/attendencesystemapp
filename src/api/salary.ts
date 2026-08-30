import { apiRequest } from "./client";

export const salaryApi = {
  getPayrollBatches: async () => {
    return apiRequest<any[]>("/api/payroll");
  },
};
