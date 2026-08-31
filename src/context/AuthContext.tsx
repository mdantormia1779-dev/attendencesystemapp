import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EmployeeUser } from "../types";
import { authApi } from "../api/auth";
import { attendanceService } from "../services/attendanceService";

interface AuthContextType {
  user: EmployeeUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStoredSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("auth_token");
      const storedUser = await AsyncStorage.getItem("auth_user");

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // সার্ভার থেকে লেটেস্ট ফ্রেশ প্রোফাইল ডেটা রিফ্রেশ
        try {
          const res: any = await authApi.getProfile();
          const freshUser = res?.data || (res?.fullName ? res : null);
          if (freshUser) {
            setUser(freshUser);
            await AsyncStorage.setItem("auth_user", JSON.stringify(freshUser));

            // যদি ডেটাবেজে ফেস রেজিস্টার্ড থাকে, তবে লোকাল স্টোরেজেও সিঙ্ক করে নেওয়া
            if (freshUser.faceDescriptor && Array.isArray(freshUser.faceDescriptor) && freshUser.faceDescriptor.length === 128) {
              await attendanceService.saveRegisteredFace(
                "local_biometric_template",
                freshUser.fullName || "Employee",
                freshUser.faceDescriptor
              );
            }
          }
        } catch (err) {
          console.log("Profile refresh notice during boot:", err);
        }
      }
    } catch (e) {
      console.error("Failed to restore auth session:", e);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadStoredSession();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res: any = await authApi.login({ email, password: pass });

      // রেসপন্স অবজেক্ট থেকে টোকেন ও ইউজার এক্সট্রাক্ট
      const activeToken = res?.data?.token || res?.token;
      const initialUser = res?.data?.user || res?.user;

      if (activeToken) {
        setToken(activeToken);
        await AsyncStorage.setItem("auth_token", activeToken);

        let finalUser = initialUser;

        // লগইন সফল হলে সরাসরি প্রোফাইল থেকে পুরো ডেটা সিঙ্ক করা
        try {
          const profileRes: any = await authApi.getProfile();
          const fullProfile = profileRes?.data || (profileRes?.fullName ? profileRes : null);
          if (fullProfile) {
            finalUser = { ...initialUser, ...fullProfile };
          }
        } catch (pErr) {
          console.log("Full profile sync notice on login:", pErr);
        }

        if (finalUser) {
          setUser(finalUser);
          await AsyncStorage.setItem("auth_user", JSON.stringify(finalUser));

          if (finalUser.faceDescriptor && Array.isArray(finalUser.faceDescriptor) && finalUser.faceDescriptor.length === 128) {
            await attendanceService.saveRegisteredFace(
              "local_biometric_template",
              finalUser.fullName || "Employee",
              finalUser.faceDescriptor
            );
          }
        }

        return { success: true };
      }

      return { success: false, message: res?.message || "Invalid credentials" };
    } catch (e: any) {
      return { success: false, message: e.message || "Login failed" };
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
  };

  const refreshProfile = async () => {
    try {
      const res: any = await authApi.getProfile();
      const freshUser = res?.data || (res?.fullName ? res : null);
      if (freshUser) {
        setUser((prev) => ({ ...prev, ...freshUser }));
        await AsyncStorage.setItem("auth_user", JSON.stringify(freshUser));

        if (freshUser.faceDescriptor && Array.isArray(freshUser.faceDescriptor) && freshUser.faceDescriptor.length === 128) {
          await attendanceService.saveRegisteredFace(
            "local_biometric_template",
            freshUser.fullName || "Employee",
            freshUser.faceDescriptor
          );
        }
      }
    } catch (e) {
      console.error("Failed to refresh profile:", e);
    }
  };


  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);