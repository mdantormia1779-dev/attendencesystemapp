import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ─── Primary backend IP ────────────────────────────────────────────────────────
// Update this to your PC's current LAN IP (run `ipconfig` on your PC to check).
export const DEFAULT_API_BASE_URL = "http://192.168.0.127:3000";

// ─── Fallback hosts tried in order ────────────────────────────────────────────
const FALLBACK_HOSTS: string[] =
  Platform.OS === "android"
    ? [
        "http://192.168.0.127:3000", // LAN IP – physical Android device
        "http://10.0.2.2:3000",      // Android Studio emulator → host localhost
        "http://localhost:3000",      // last resort
      ]
    : [
        "http://192.168.0.127:3000",
        "http://localhost:3000",
        "http://10.0.2.2:3000",
      ];

// Cache the last working base URL so next call skips retries
let _workingBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem("custom_server_url");
    if (saved && saved.startsWith("http")) return saved;
  } catch {}
  return DEFAULT_API_BASE_URL;
}

// Build a deduplicated ordered list of base URLs to try
async function buildBaseUrls(endpoint: string): Promise<string[]> {
  if (endpoint.startsWith("http")) return [endpoint];

  const custom = await getApiBaseUrl();
  const ordered = [
    ...(_workingBaseUrl ? [_workingBaseUrl] : []), // last known good URL first
    custom,
    ...FALLBACK_HOSTS,
  ];

  // Remove duplicates while preserving order
  const seen = new Set<string>();
  return ordered.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

// ─── Core request function ─────────────────────────────────────────────────────
export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; data?: T; quotas?: any; message?: string }> {
  const token = await AsyncStorage.getItem("auth_token").catch(() => null);
  const storedUserStr = await AsyncStorage.getItem("auth_user").catch(() => null);
  const user = storedUserStr ? JSON.parse(storedUserStr) : null;
  const employeeId = user?.employeeCode || user?.employeeId || "EMP-0001";
  const userId = user?.id || user?.userId || "";
  const userEmail = user?.email || "";
  const orgId = user?.organizationId || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : { Authorization: "Bearer employee-token" }),
    "x-employee-id": employeeId,
    ...(userId ? { "x-user-id": userId } : {}),
    ...(userEmail ? { "x-user-email": userEmail } : {}),
    "x-user-role": user?.role || "EMPLOYEE",
    ...(orgId ? { "x-organization-id": orgId } : {}),
    ...options.headers,
  };


  const baseUrls = await buildBaseUrls(endpoint);
  let lastError: any = null;

  for (const base of baseUrls) {
    const url = endpoint.startsWith("http") ? endpoint : `${base}${endpoint}`;
    console.log(`[API] Trying → ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 s per host

      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Cache successful base so next call skips retries
      if (!endpoint.startsWith("http")) {
        _workingBaseUrl = base;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      lastError = error;
      console.warn(`[API] Failed ${url} →`, error?.message);
      // If a full URL was given, don't retry other hosts
      if (endpoint.startsWith("http")) break;
    }
  }

  const isTimeout =
    lastError?.message?.toLowerCase().includes("abort") ||
    lastError?.message?.toLowerCase().includes("timeout");

  console.error(`[API] All hosts failed for ${endpoint}:`, lastError?.message);
  return {
    success: false,
    message: isTimeout
      ? "Server connection timed out. Make sure the Next.js backend (npm run dev) is running on your PC."
      : "Network request failed. Make sure your phone and PC are on the same Wi-Fi, and the backend server is running.",
  };
}

