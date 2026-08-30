import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native"; // added for Android detection

// Primary Local Network IP of the Next.js backend server
export const DEFAULT_API_BASE_URL = "http://192.168.0.164:3000";

// Fallback host candidates for Android Emulator, Localhost, etc.
const FALLBACK_HOSTS = Platform.OS === "android"
  ? [
      "http://10.0.2.2:3000", // Android emulator
      "http://192.168.0.164:3000", // LAN IP (real device)
      "http://localhost:3000",
    ]
  : [
      "http://192.168.0.164:3000",
      "http://10.0.2.2:3000",
      "http://localhost:3000",
    ];

export async function getApiBaseUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem("custom_server_url");
    if (saved && saved.startsWith("http")) return saved;
  } catch {}
  return DEFAULT_API_BASE_URL;
}

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
  const employeeId = user?.employeeCode || user?.employeeId || user?.id || "EMP-0001";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: "Bearer employee-token" }),
    "x-employee-id": employeeId,
    "x-user-role": "EMPLOYEE",
    "x-organization-id": user?.organizationId || "org-1",
    ...options.headers,
  };

  const baseUrls = endpoint.startsWith("http")
    ? [endpoint]
    : [await getApiBaseUrl(), ...FALLBACK_HOSTS.filter((h) => h !== DEFAULT_API_BASE_URL)];

  let lastError: any = null;

  for (const base of baseUrls) {
    const url = endpoint.startsWith("http") ? endpoint : `${base}${endpoint}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      return data;
    } catch (error: any) {
      lastError = error;
      // If direct URL was provided, don't retry other hosts
      if (endpoint.startsWith("http")) break;
    }
  }

  console.log(`[API Network fallback for ${endpoint}]:`, lastError?.message || "Network request failed");
  return {
    success: false,
    message: lastError?.message?.includes("abort")
      ? "Server connection timed out. Make sure Next.js backend (npm run dev) is running on your PC."
      : "Network request failed. Make sure your phone and PC are on the same Wi-Fi network.",
  };
}
