import AsyncStorage from "@react-native-async-storage/async-storage";
import { AttendancePunch, LeaveRequest, SalaryPayslip, LeaveStats, LeaveQuotaCategory } from "../types";
import { attendanceApi } from "../api/attendance";
import { leavesApi } from "../api/leaves";
import { salaryApi } from "../api/salary";
import { faceApi } from "./faceApi";


const KEYS = {
  REGISTERED_FACE: "sa_face_meta_v4",
  TODAY_PUNCH: "sa_punch_meta_v4",
  ATTENDANCE_LOGS: "sa_logs_v4",
  LEAVE_BALANCES: "sa_balances_v4",
  LEAVE_REQUESTS: "sa_requests_v4",
};

export interface RegisteredFaceData {
  registered: boolean;
  registeredAt?: string;
  name?: string;
  photoUri?: string;
  faceDescriptor?: number[];
}

export interface TodayPunchState {
  hasPunchedIn: boolean;
  hasPunchedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  checkInTimestamp?: number;
  checkOutTimestamp?: number;
  date: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "NOT_YET";
  workedHours: number;
  overtimeHours: number;
  locationStatus: "IN_OFFICE" | "REMOTE" | "OUTSIDE_RADIUS";
  photoUri?: string;
}

export interface LeaveBalances {
  CASUAL: number;
  SICK: number;
  ANNUAL: number;
  UNPAID: number;
}

export const OFFICE_TIMINGS = {
  shiftStart: "09:00 AM",
  shiftEnd: "06:00 PM",
  shiftStartHour: 9,
  shiftStartMinute: 0,
  gracePeriodMinutes: 15,
  standardHours: 9,
  overtimeRatePerHour: 350,
  workingDays: "Sun - Thu (09:00 AM - 06:00 PM)",
};

const DEFAULT_LEAVE_BALANCES: LeaveBalances = {
  CASUAL: 10,
  SICK: 10,
  ANNUAL: 15,
  UNPAID: 0,
};

class AttendanceService {
  constructor() {
    this.cleanLegacyLargeKeys();
  }

  private async cleanLegacyLargeKeys() {
    try {
      const legacyKeys = [
        "sa_registered_face_v2",
        "sa_today_punch_v2",
        "sa_registered_face_v3",
        "sa_today_punch_v3",
        "sa_registered_face",
        "sa_today_punch",
      ];
      await AsyncStorage.multiRemove(legacyKeys);
    } catch (e) {
      // ignore
    }
  }

  private async getCurrentEmployeeId(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem("auth_user");
      if (stored) {
        const u = JSON.parse(stored);
        return u.id || u.userId || u.employeeCode || u.employeeId || "EMP-0001";
      }
    } catch (e) {}
    return "EMP-0001";
  }


  formatTime(date: Date): string {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  // -------------------------------------------------------------
  // 1. FACE BIOMETRIC REGISTRATION & 128-D VECTOR MATCHING
  // -------------------------------------------------------------
  async getRegisteredFace(): Promise<RegisteredFaceData> {
    try {
      const data = await AsyncStorage.getItem(KEYS.REGISTERED_FACE);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.registered && Array.isArray(parsed.faceDescriptor) && parsed.faceDescriptor.length === 128) {
          return parsed;
        }
      }

      // Sync from backend database if local cache is empty
      const empId = await this.getCurrentEmployeeId();
      if (empId) {
        const statusRes = await faceApi.getFaceStatus(empId).catch(() => null);
        if (statusRes?.success && statusRes.data?.isEnrolled && (statusRes.data as any)?.descriptor) {
          const syncedFace: RegisteredFaceData = {
            registered: true,
            registeredAt: statusRes.data.enrolledAt || new Date().toISOString(),
            name: "Employee",
            faceDescriptor: (statusRes.data as any).descriptor,
          };
          await AsyncStorage.setItem(KEYS.REGISTERED_FACE, JSON.stringify(syncedFace)).catch(() => {});
          return syncedFace;
        }
      }
    } catch (e) {
      console.log("getRegisteredFace sync note:", e);
    }
    return { registered: false };
  }

  /**
   * Flexible face template saver: supports object payload or individual parameters
   */
  async saveRegisteredFace(
    dataOrPhoto?: RegisteredFaceData | string,
    name = "Employee",
    descriptor?: number[]
  ): Promise<RegisteredFaceData> {
    let faceData: RegisteredFaceData;

    if (typeof dataOrPhoto === "object" && dataOrPhoto !== null) {
      // Handled as object structure
      faceData = {
        registered: Boolean(dataOrPhoto.registered),
        registeredAt: dataOrPhoto.registeredAt || new Date().toISOString(),
        name: dataOrPhoto.name || name,
        photoUri: dataOrPhoto.photoUri,
        faceDescriptor: dataOrPhoto.faceDescriptor,
      };
    } else {
      // Handled as individual arguments
      faceData = {
        registered: true,
        registeredAt: new Date().toISOString(),
        name,
        photoUri: dataOrPhoto ? (dataOrPhoto.startsWith("data:") ? "local_biometric_template" : dataOrPhoto) : undefined,
        faceDescriptor: descriptor,
      };
    }

    try {
      await AsyncStorage.setItem(KEYS.REGISTERED_FACE, JSON.stringify(faceData));
      console.log(`[AttendanceService]: Face template saved with ${faceData.faceDescriptor?.length || 0}D descriptor.`);
    } catch (e) {
      console.log("Safe save face notice:", e);
    }
    return faceData;
  }

  async verifyFace(photoUri?: string, liveDescriptor?: number[]): Promise<{ matched: boolean; score: number; message: string }> {
    const registered = await this.getRegisteredFace();

    if (!registered.registered || !registered.faceDescriptor || registered.faceDescriptor.length !== 128) {
      return {
        matched: false,
        score: 0,
        message: "No biometric face profile enrolled for your account.",
      };
    }

    if (!liveDescriptor || !Array.isArray(liveDescriptor) || liveDescriptor.length !== 128) {
      return {
        matched: false,
        score: 0,
        message: "No face detected in camera frame. Please keep face inside circle.",
      };
    }

    const baseline = registered.faceDescriptor;
    const probe = liveDescriptor;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < 128; i++) {
      dot += (probe[i] || 0) * (baseline[i] || 0);
      normA += (probe[i] || 0) * (probe[i] || 0);
      normB += (baseline[i] || 0) * (baseline[i] || 0);
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
    const cosineSim = Math.max(-1, Math.min(1, dot / denom));
    const score = parseFloat((cosineSim * 100).toFixed(1));
    const matched = cosineSim >= 0.58;

    return {
      matched,
      score,
      message: matched
        ? `Live Identity Verified (${score}% Match with Enrolled Face)`
        : `Face Not Matched (${score}% Match, Required 58.0%)`,
    };
  }


  // -------------------------------------------------------------
  // 2. TODAY'S ATTENDANCE PUNCH & OVERTIME
  // -------------------------------------------------------------
  async getTodayPunch(): Promise<TodayPunchState> {
    const todayStr = this.formatDate(new Date());
    let localState: TodayPunchState = {
      hasPunchedIn: false,
      hasPunchedOut: false,
      date: todayStr,
      status: "NOT_YET",
      workedHours: 0,
      overtimeHours: 0,
      locationStatus: "IN_OFFICE",
    };

    try {
      const stored = await AsyncStorage.getItem(KEYS.TODAY_PUNCH);
      if (stored) {
        const parsed: TodayPunchState = JSON.parse(stored);
        if (parsed.date === todayStr) {
          localState = parsed;
        }
      }
    } catch (e) {
      await AsyncStorage.removeItem(KEYS.TODAY_PUNCH).catch(() => {});
    }

    // Sync from database if available
    try {
      const empId = await this.getCurrentEmployeeId();
      const dbRes = await attendanceApi.getTodayStatus(empId).catch(() => null);
      if (dbRes?.success && dbRes?.data) {
        const d = dbRes.data;
        const syncedState: TodayPunchState = {
          hasPunchedIn: Boolean(d.hasPunchedIn),
          hasPunchedOut: Boolean(d.hasPunchedOut),
          checkInTime: d.checkInTime || localState.checkInTime,
          checkInTimestamp: d.checkInTimestamp || localState.checkInTimestamp,
          checkOutTime: d.checkOutTime || localState.checkOutTime,
          checkOutTimestamp: d.checkOutTimestamp || localState.checkOutTimestamp,
          date: todayStr,
          status: d.status || localState.status || "PRESENT",
          workedHours: typeof d.workedHours === "number" ? d.workedHours : localState.workedHours,
          overtimeHours: typeof d.overtimeHours === "number" ? d.overtimeHours : localState.overtimeHours,
          locationStatus: "IN_OFFICE",
        };
        await AsyncStorage.setItem(KEYS.TODAY_PUNCH, JSON.stringify(syncedState)).catch(() => {});
        return syncedState;
      }
    } catch (e) {}

    return localState;
  }

  async punchIn(photoUri?: string, lat = 23.8103, lng = 90.4125): Promise<TodayPunchState> {
    const now = new Date();
    const todayStr = this.formatDate(now);
    const timeStr = this.formatTime(now);
    const employeeId = await this.getCurrentEmployeeId();

    // Parse dynamic user shift start time from stored user session
    let shiftStartHour = 9;
    let shiftStartMinute = 0;
    let graceMinutes = 15;

    try {
      const storedUser = await AsyncStorage.getItem("auth_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.shiftStart) {
          const match = u.shiftStart.match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?$/);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const meridiem = match[3]?.toUpperCase();
            if (meridiem === "PM" && h < 12) h += 12;
            if (meridiem === "AM" && h === 12) h = 0;
            shiftStartHour = h;
            shiftStartMinute = m;
          }
        }
        if (typeof u.shiftGracePeriod === "number") {
          graceMinutes = u.shiftGracePeriod;
        }
      }
    } catch (e) {}

    const totalNowMinutes = now.getHours() * 60 + now.getMinutes();
    const cutoffMinutes = shiftStartHour * 60 + shiftStartMinute + graceMinutes;
    const isLate = totalNowMinutes > cutoffMinutes;
    const status = isLate ? "LATE" : "PRESENT";

    const state: TodayPunchState = {
      hasPunchedIn: true,
      hasPunchedOut: false,
      checkInTime: timeStr,
      checkInTimestamp: now.getTime(),
      date: todayStr,
      status,
      workedHours: 0,
      overtimeHours: 0,
      locationStatus: "IN_OFFICE",
      photoUri: photoUri && !photoUri.startsWith("data:") ? photoUri : undefined,
    };

    try {
      await AsyncStorage.setItem(KEYS.TODAY_PUNCH, JSON.stringify(state));
      await this.updateAttendanceHistory(state);
    } catch (e) {}

    try {
      const apiRes = await attendanceApi.checkIn({
        employeeId,
        latitude: lat,
        longitude: lng,
        verificationMethod: "GPS_GEOFENCE",
      });
      if (apiRes?.data) {
        state.checkInTime = apiRes.data.checkInTime || state.checkInTime;
        state.status = apiRes.data.status || state.status;
        await AsyncStorage.setItem(KEYS.TODAY_PUNCH, JSON.stringify(state)).catch(() => {});
      }
    } catch (apiErr) {
      console.log("Backend check-in notice:", apiErr);
    }

    return state;
  }

  async punchOut(photoUri?: string, lat = 23.8103, lng = 90.4125): Promise<TodayPunchState> {
    const now = new Date();
    const timeStr = this.formatTime(now);
    const today = await this.getTodayPunch();
    const employeeId = await this.getCurrentEmployeeId();

    const checkInTimeMs = today.checkInTimestamp || (now.getTime() - 9.5 * 3600 * 1000);
    const diffMs = Math.max(0, now.getTime() - checkInTimeMs);
    const workedHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const overtimeHours = workedHours > OFFICE_TIMINGS.standardHours
      ? parseFloat((workedHours - OFFICE_TIMINGS.standardHours).toFixed(2))
      : 0;

    const state: TodayPunchState = {
      ...today,
      hasPunchedIn: true,
      hasPunchedOut: true,
      checkOutTime: timeStr,
      checkOutTimestamp: now.getTime(),
      workedHours,
      overtimeHours,
      photoUri: photoUri && !photoUri.startsWith("data:") ? photoUri : undefined,
    };

    try {
      await AsyncStorage.setItem(KEYS.TODAY_PUNCH, JSON.stringify(state));
      await this.updateAttendanceHistory(state);
    } catch (e) {}

    try {
      const apiRes = await attendanceApi.checkOut({
        employeeId,
        latitude: lat,
        longitude: lng,
        verificationMethod: "GPS_GEOFENCE",
      });
      if (apiRes?.data) {
        state.checkOutTime = apiRes.data.checkOutTime || state.checkOutTime;
        if (typeof apiRes.data.workedHours === "number") {
          state.workedHours = apiRes.data.workedHours;
        }
        await AsyncStorage.setItem(KEYS.TODAY_PUNCH, JSON.stringify(state)).catch(() => {});
      }
    } catch (apiErr) {
      console.log("Backend check-out notice:", apiErr);
    }

    return state;
  }


  // -------------------------------------------------------------
  // 3. ATTENDANCE HISTORY LOGS
  // -------------------------------------------------------------
  async getAttendanceHistory(): Promise<AttendancePunch[]> {
    const employeeId = await this.getCurrentEmployeeId();
    let liveLogs: AttendancePunch[] = [];

    try {
      const res = await attendanceApi.getAttendanceLogs(employeeId);
      if (res.success && Array.isArray(res.data)) {
        const realPunches = res.data.filter((item: any) => item.checkInTime && item.checkInTime !== "-" && item.checkInTime !== "--:--");

        liveLogs = realPunches.map((item: any, idx: number) => ({
          id: item.id || `punch-${idx}`,
          date: item.date || "Today",
          checkInTime: item.checkInTime || "--:--",
          checkOutTime: item.checkOutTime || null,
          status: item.status === "LATE" ? "LATE" : "PRESENT",
          locationStatus: "IN_OFFICE",
          overtimeHours: item.overtimeHours || 0,
        }));
      }
    } catch (e) {
      console.log("Backend attendance logs fetch notice:", e);
    }

    const today = await this.getTodayPunch();
    if (today.hasPunchedIn) {
      const existingTodayIndex = liveLogs.findIndex((l) => l.date === "Today" || l.date === today.date);
      const todayEntry: AttendancePunch = {
        id: `punch-today-${today.date}`,
        date: today.date,
        checkInTime: today.checkInTime || "--:--",
        checkOutTime: today.checkOutTime || null,
        status: today.status === "NOT_YET" ? "PRESENT" : today.status,
        locationStatus: "IN_OFFICE",
        overtimeHours: today.overtimeHours,
      };

      if (existingTodayIndex >= 0) {
        liveLogs[existingTodayIndex] = todayEntry;
      } else {
        liveLogs = [todayEntry, ...liveLogs];
      }
    }

    if (liveLogs.length > 0) {
      await AsyncStorage.setItem(KEYS.ATTENDANCE_LOGS, JSON.stringify(liveLogs)).catch(() => {});
      return liveLogs;
    }

    try {
      const stored = await AsyncStorage.getItem(KEYS.ATTENDANCE_LOGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return [];
  }

  private async updateAttendanceHistory(todayState: TodayPunchState): Promise<void> {
    const logs = await this.getAttendanceHistory();
    const existingIndex = logs.findIndex((l) => l.date === "Today" || l.date === todayState.date);

    const todayPunchRecord: AttendancePunch = {
      id: `punch-${todayState.date}`,
      date: todayState.date,
      checkInTime: todayState.checkInTime || "--:--",
      checkOutTime: todayState.checkOutTime || null,
      status: todayState.status === "NOT_YET" ? "PRESENT" : todayState.status,
      locationStatus: "IN_OFFICE",
      overtimeHours: todayState.overtimeHours,
    };

    let updatedLogs: AttendancePunch[];
    if (existingIndex >= 0) {
      updatedLogs = [...logs];
      updatedLogs[existingIndex] = todayPunchRecord;
    } else {
      updatedLogs = [todayPunchRecord, ...logs];
    }

    await AsyncStorage.setItem(KEYS.ATTENDANCE_LOGS, JSON.stringify(updatedLogs)).catch(() => {});
  }

  // -------------------------------------------------------------
  // 4. LEAVES MANAGEMENT
  // -------------------------------------------------------------
  async getLeaveBalances(): Promise<LeaveBalances> {
    const stats = await this.getLeaveStats();
    const balances: LeaveBalances = {
      CASUAL: stats.CASUAL.remaining,
      SICK: stats.SICK.remaining,
      ANNUAL: stats.ANNUAL.remaining,
      UNPAID: 0,
    };
    await AsyncStorage.setItem(KEYS.LEAVE_BALANCES, JSON.stringify(balances)).catch(() => {});
    return balances;
  }

  async getLeaveStats(): Promise<LeaveStats> {
    const employeeId = await this.getCurrentEmployeeId();
    let requests: LeaveRequest[] = [];
    let customQuotas: any = null;

    try {
      const res = await leavesApi.getLeaves(employeeId);
      if (res.success) {
        if (res.quotas) customQuotas = res.quotas;
        if (Array.isArray(res.data)) {
          requests = res.data.map((item: any) => ({
            id: item.id || `leave-${Math.random()}`,
            leaveType: item.type || item.leaveType || "CASUAL",
            startDate: item.startDate ? item.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
            endDate: item.endDate ? item.endDate.split("T")[0] : new Date().toISOString().split("T")[0],
            daysCount: Number(item.daysCount || item.days || 1),
            reason: item.reason || "Leave application",
            status: item.status || "PENDING",
            managerComment: item.managerComment || item.comment || (item.status === "PENDING" ? "Awaiting review by Supervisor / HR Manager" : "Approved"),
            createdAt: item.createdAt ? item.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
          }));
          await AsyncStorage.setItem(KEYS.LEAVE_REQUESTS, JSON.stringify(requests)).catch(() => {});
        }
      }
    } catch (e) {
      console.log("Leaves API fetch error in stats:", e);
    }

    if (requests.length === 0) {
      try {
        const stored = await AsyncStorage.getItem(KEYS.LEAVE_REQUESTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) requests = parsed;
        }
      } catch (e) {}
    }

    // Standard Quota Base Allocations
    let totalCasual = customQuotas?.CASUAL?.total ?? 10;
    let totalSick = customQuotas?.SICK?.total ?? 10;
    let totalAnnual = customQuotas?.ANNUAL?.total ?? 15;
    let totalUnpaid = customQuotas?.UNPAID?.total ?? 0;

    let usedCasual = 0;
    let usedSick = 0;
    let usedAnnual = 0;
    let usedUnpaid = 0;

    let pendingCasual = 0;
    let pendingSick = 0;
    let pendingAnnual = 0;
    let pendingUnpaid = 0;

    for (const req of requests) {
      const days = Number(req.daysCount) || 1;
      const type = (req.leaveType || "").toUpperCase();
      const status = (req.status || "").toUpperCase();

      if (status === "APPROVED") {
        if (type === "CASUAL") usedCasual += days;
        else if (type === "SICK") usedSick += days;
        else if (type === "ANNUAL") usedAnnual += days;
        else if (type === "UNPAID") usedUnpaid += days;
      } else if (status === "PENDING") {
        if (type === "CASUAL") pendingCasual += days;
        else if (type === "SICK") pendingSick += days;
        else if (type === "ANNUAL") pendingAnnual += days;
        else if (type === "UNPAID") pendingUnpaid += days;
      }
    }

    // If server provided explicit remaining/used, prioritize it
    if (customQuotas?.CASUAL?.used !== undefined) usedCasual = customQuotas.CASUAL.used;
    if (customQuotas?.SICK?.used !== undefined) usedSick = customQuotas.SICK.used;
    if (customQuotas?.ANNUAL?.used !== undefined) usedAnnual = customQuotas.ANNUAL.used;

    const remainingCasual = customQuotas?.CASUAL?.remaining ?? Math.max(0, totalCasual - usedCasual);
    const remainingSick = customQuotas?.SICK?.remaining ?? Math.max(0, totalSick - usedSick);
    const remainingAnnual = customQuotas?.ANNUAL?.remaining ?? Math.max(0, totalAnnual - usedAnnual);

    const totalApproved = usedCasual + usedSick + usedAnnual + usedUnpaid;
    const totalPending = pendingCasual + pendingSick + pendingAnnual + pendingUnpaid;

    return {
      CASUAL: {
        total: totalCasual,
        used: usedCasual,
        pending: pendingCasual,
        remaining: remainingCasual,
      },
      SICK: {
        total: totalSick,
        used: usedSick,
        pending: pendingSick,
        remaining: remainingSick,
      },
      ANNUAL: {
        total: totalAnnual,
        used: usedAnnual,
        pending: pendingAnnual,
        remaining: remainingAnnual,
      },
      UNPAID: {
        total: totalUnpaid,
        used: usedUnpaid,
        pending: pendingUnpaid,
        remaining: 0,
      },
      totalApprovedDays: totalApproved,
      totalPendingDays: totalPending,
      totalRemainingDays: remainingCasual + remainingSick + remainingAnnual,
    };
  }


  async getLeaveRequests(): Promise<LeaveRequest[]> {
    const employeeId = await this.getCurrentEmployeeId();
    try {
      const res = await leavesApi.getLeaves(employeeId);
      if (res.success && Array.isArray(res.data)) {
        const transformed: LeaveRequest[] = res.data.map((item: any) => ({
          id: item.id,
          leaveType: item.type || item.leaveType || "CASUAL",
          startDate: item.startDate ? item.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
          endDate: item.endDate ? item.endDate.split("T")[0] : new Date().toISOString().split("T")[0],
          daysCount: item.daysCount || item.days || 1,
          reason: item.reason || "Leave application",
          status: item.status || "PENDING",
          managerComment: item.managerComment || item.comment || (item.status === "PENDING" ? "Awaiting review by Supervisor / HR Manager" : "Approved"),
          createdAt: item.createdAt ? item.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
        }));
        await AsyncStorage.setItem(KEYS.LEAVE_REQUESTS, JSON.stringify(transformed)).catch(() => {});
        return transformed;
      }
    } catch (e) {}

    try {
      const stored = await AsyncStorage.getItem(KEYS.LEAVE_REQUESTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    return [];
  }

  async applyLeave(data: {
    leaveType: "CASUAL" | "SICK" | "ANNUAL" | "UNPAID";
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<{ success: boolean; message: string; leave: LeaveRequest }> {
    const employeeId = await this.getCurrentEmployeeId();
    const balances = await this.getLeaveBalances();

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    if (data.leaveType !== "UNPAID" && balances[data.leaveType] < daysCount) {
      return {
        success: false,
        message: `Insufficient ${data.leaveType.toLowerCase()} leave balance (${balances[data.leaveType]} days remaining).`,
        leave: null as any,
      };
    }

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      daysCount,
      reason: data.reason,
      status: "PENDING",
      managerComment: "Submitted. Awaiting supervisor / HR manager approval.",
      createdAt: this.formatDate(new Date()),
    };

    const requests = await this.getLeaveRequests();
    const updated = [newLeave, ...requests];
    await AsyncStorage.setItem(KEYS.LEAVE_REQUESTS, JSON.stringify(updated)).catch(() => {});

    try {
      await leavesApi.apply({
        employeeId,
        type: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
      });
    } catch (apiErr) {
      console.log("Backend apply leave notice:", apiErr);
    }

    return {
      success: true,
      message: `Leave application for ${daysCount} day(s) submitted. Current status: PENDING manager review.`,
      leave: newLeave,
    };
  }

  // -------------------------------------------------------------
  // 5. SALARY & PAYSLIPS
  // -------------------------------------------------------------
  async getPayslips(): Promise<SalaryPayslip[]> {
    const employeeId = await this.getCurrentEmployeeId();

    try {
      const res = await salaryApi.getPayrollBatches();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const foundSlips: SalaryPayslip[] = [];
        for (const batch of res.data) {
          if (Array.isArray(batch.payslips)) {
            const empSlip = batch.payslips.find((p: any) => p.employeeId === employeeId || p.employeeId === "EMP-0001" || p.id === employeeId);
            if (empSlip) {
              const [yearStr, monthStr] = (batch.month || "2026-08").split("-");
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const mName = monthNames[parseInt(monthStr, 10) - 1] || "August";

              foundSlips.push({
                id: empSlip.id,
                month: mName,
                year: parseInt(yearStr, 10),
                basicSalary: Number(empSlip.basicSalary) || 65000,
                houseRent: Number(empSlip.houseRent) || 20000,
                medicalAllowance: Number(empSlip.medicalAllowance) || 5000,
                overtimePay: Number(empSlip.overtimePay) || 0,
                bonus: Number(empSlip.bonus) || 0,
                taxDeduction: Number(empSlip.taxDeduction) || 3500,
                providentFund: Number(empSlip.providentFund) || 4000,
                netPayable: Number(empSlip.netSalary) || 82500,
                paymentStatus: empSlip.status === "PAID" ? "PAID" : "PROCESSING",
                paymentDate: batch.createdAt || "2026-08-01",
              });
            }
          }
        }
        if (foundSlips.length > 0) {
          return foundSlips;
        }
      }
    } catch (e) {
      console.log("Backend payroll fallback notice:", e);
    }

    return [];
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;