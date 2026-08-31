export interface EmployeeUser {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  employeeCode: string;
  role: "EMPLOYEE";
  designation?: string;
  department?: string;
  branch?: string;
  organizationId?: string;
  profilePicture?: string | null;
  phone?: string;
  joiningDate?: string;
  faceRegistered?: boolean;
  // Admin-configured branch location (from organization setup)
  branchId?: string;
  branchName?: string;
  branchLatitude?: number;
  branchLongitude?: number;
  geofenceRadius?: number;
}

export interface AttendancePunch {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY";
  faceMatchScore?: number;
  locationStatus?: "IN_OFFICE" | "REMOTE" | "OUTSIDE_RADIUS";
  deviceInfo?: string;
  overtimeHours?: number;
}

export interface LeaveRequest {
  id: string;
  leaveType: "CASUAL" | "SICK" | "ANNUAL" | "UNPAID";
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  managerComment?: string;
  createdAt: string;
}

export interface LeaveQuotaCategory {
  total: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface LeaveStats {
  CASUAL: LeaveQuotaCategory;
  SICK: LeaveQuotaCategory;
  ANNUAL: LeaveQuotaCategory;
  UNPAID: LeaveQuotaCategory;
  totalApprovedDays: number;
  totalPendingDays: number;
  totalRemainingDays: number;
}


export interface SalaryPayslip {
  id: string;
  month: string;
  year: number;
  basicSalary: number;
  houseRent: number;
  medicalAllowance: number;
  overtimePay: number;
  bonus: number;
  taxDeduction: number;
  providentFund: number;
  netPayable: number;
  paymentStatus: "PAID" | "PENDING" | "PROCESSING";
  paymentDate?: string;
}

export interface ReferralWithdrawal {
  id?: string;
  amount: number;
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Bank" | string;
  paymentDetails: string;
  accountName?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "COMPLETED";
  createdAt: string;
  transactionId?: string;
  note?: string;
}

export interface ReferralAccount {
  referralCode: string;
  referralLink: string;
  commissionRate: number;
  availableBalance: number;
  pendingCommission: number;
  totalClicks: number;
  totalRegistrations: number;
  totalPaidCustomers: number;
  totalEarnings?: number;
  currency?: string;
  withdrawals?: ReferralWithdrawal[];
}

