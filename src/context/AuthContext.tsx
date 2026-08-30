import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EmployeeUser } from "../types";
import { authApi } from "../api/auth";

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
        // Fetch fresh profile
        const res = await authApi.getProfile();
        if (res.success && res.data) {
          setUser(res.data);
          await AsyncStorage.setItem("auth_user", JSON.stringify(res.data));
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
      const res = await authApi.login({ email, password: pass });
      if (res.success && res.data?.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        await AsyncStorage.setItem("auth_token", res.data.token);
        await AsyncStorage.setItem("auth_user", JSON.stringify(res.data.user));
        return { success: true };
      }
      return { success: false, message: res.message || "Invalid credentials" };
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
      const res = await authApi.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
        await AsyncStorage.setItem("auth_user", JSON.stringify(res.data));
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
