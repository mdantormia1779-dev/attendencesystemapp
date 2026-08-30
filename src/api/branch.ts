import { apiRequest } from "./client";

export interface BranchLocationData {
  branchId: string;
  branchName: string;
  branchCode: string;
  branchAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number;
  status: string;
}

export const branchApi = {
  /**
   * Fetch the employee's assigned branch location from the database.
   * Returns admin-configured latitude, longitude, geofenceRadius.
   */
  getBranchLocation: async () => {
    return apiRequest<BranchLocationData>("/api/employee/branch-location");
  },
};
