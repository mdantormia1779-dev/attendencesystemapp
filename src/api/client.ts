import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ─── Primary local & cloud URLs ──────────────────────────────────────────────
export const LOCAL_DEV_URL = "http://192.168.0.218:3000";
export const PRODUCTION_URL = "https://antorsmartattendencesystem.vercel.app";

const CANDIDATE_HOSTS: string[] = [
  PRODUCTION_URL,
  LOCAL_DEV_URL,
  "http://192.168.0.127:3000",
  ...(Platform.OS === "android" ? ["http://10.0.2.2:3000"] : []),
  "http://localhost:3000",
];

// ─── Production Backend ──────────────────────────────────────────────────────
export const DEFAULT_API_BASE_URL =
  "https://antorsmartattendencesystem.vercel.app";

// Cache last working URL
let _workingBaseUrl: string | null = null;

// ─── Get API Base URL ─────────────────────────────────────────────────────────
export async function getApiBaseUrl(): Promise<string> {
  if (_workingBaseUrl) return _workingBaseUrl;
  try {
    const saved = await AsyncStorage.getItem("custom_server_url");
    if (saved && saved.startsWith("http")) {
      return saved.replace(/\/+$/, "");
    }
  } catch {}
  return PRODUCTION_URL;
}

export function setWorkingBaseUrl(url: string) {
  _workingBaseUrl = url.replace(/\/+$/, "");
}

async function buildBaseUrls(endpoint: string): Promise<string[]> {
  if (endpoint.startsWith("http")) return [endpoint];

  const custom = await AsyncStorage.getItem("custom_server_url").catch(() => null);
  const list: string[] = [];

  if (_workingBaseUrl) list.push(_workingBaseUrl);
  if (custom && custom.startsWith("http")) list.push(custom.replace(/\/+$/, ""));
  list.push(...CANDIDATE_HOSTS);

  // Deduplicate preserving order
  const seen = new Set<string>();
  return list.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

// ─── Core API Request ─────────────────────────────────────────────────────────
export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<{
  success: boolean;
  data?: T;
  quotas?: any;
  message?: string;
}> {
  try {
    const token = await AsyncStorage.getItem("auth_token").catch(
      () => null
    );

    const storedUserStr = await AsyncStorage.getItem("auth_user").catch(
      () => null
    );

    let user: any = null;

    try {
      user = storedUserStr ? JSON.parse(storedUserStr) : null;
    } catch {
      user = null;
    }

    const employeeId =
      user?.employeeCode ||
      user?.employeeId ||
      "EMP-0001";

    const userId =
      user?.id ||
      user?.userId ||
      "";

    const userEmail = user?.email || "";
    const orgId = user?.organizationId || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      "x-employee-id": employeeId,

      ...(userId
        ? {
            "x-user-id": userId,
          }
        : {}),

      ...(userEmail
        ? {
            "x-user-email": userEmail,
          }
        : {}),

      "x-user-role": user?.role || "EMPLOYEE",

      ...(orgId
        ? {
            "x-organization-id": orgId,
          }
        : {}),

      ...options.headers,
    };

    const baseUrls = await buildBaseUrls(endpoint);
    let lastError: any = null;

    for (const base of baseUrls) {
      const url = endpoint.startsWith("http") ? endpoint : `${base}${endpoint}`;
      const timeoutMs = _workingBaseUrl === base ? 8000 : 3000;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        console.log(`[API] Trying → ${url}`);

        const response = await fetch(url, {
          method: options.method || "GET",
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Cache working host for super-fast future calls
        if (!endpoint.startsWith("http")) {
          _workingBaseUrl = base;
        }

        let data: any;
        try {
          data = await response.json();
        } catch {
          return {
            success: false,
            message: `Invalid server response (${response.status})`,
          };
        }

        console.log(`[API] Response ${response.status} from ${base} →`, data?.success ?? true);

        if (!response.ok) {
          return {
            success: false,
            data,
            message: data?.message || `Server error: ${response.status}`,
          };
        }

        return data;
      } catch (err: any) {
        lastError = err;
        console.warn(`[API] Host failed: ${url} → ${err?.message || err}`);
        if (endpoint.startsWith("http")) break;
      }
    }

    const isTimeout =
      lastError?.name === "AbortError" ||
      lastError?.message?.toLowerCase().includes("timeout") ||
      lastError?.message?.toLowerCase().includes("abort");

    return {
      success: false,
      message: isTimeout
        ? "Server connection timed out. Please make sure the backend is running."
        : "Network request failed. Make sure your phone and PC are on the same Wi-Fi.",
    };
  } catch (error: any) {
    console.error(`[API] Request fatal error:`, error?.message);
    return {
      success: false,
      message: "An unexpected network error occurred.",
    };
  }
}