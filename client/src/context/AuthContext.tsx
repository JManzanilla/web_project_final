import React, { createContext, useContext, useState } from "react";
import { apiPost, apiPut, getToken, setToken, clearToken } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------
export type UserRole = "admin" | "lider" | "anotador" | "transmision";
export type SectionKey = "roster" | "match" | "schedule" | "config" | "accounts" | "stream";
export type SectionPerm = { view: boolean; edit: boolean };
export type UserPermissions = Partial<Record<SectionKey, SectionPerm>>;

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  teamId: string | null;
  firstLogin: boolean;
  permissions: UserPermissions;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

// ---------------------------------------------------------------------------
// HELPERS localStorage
// ---------------------------------------------------------------------------
const LS_USER = "auth_user";

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LS_USER);
    // only keep if token also exists
    if (!raw || !getToken()) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CONTEXTO
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    try {
      const data = await apiPost<{ token: string; user: AuthUser }>(
        "/api/login",
        { username, password },
      );
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(LS_USER, JSON.stringify(data.user));
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    clearToken();
    setUser(null);
    localStorage.removeItem(LS_USER);
  };

  // ── Cambiar contraseña ─────────────────────────────────────────────────────
  const changePassword = async (newPassword: string) => {
    try {
      await apiPut("/api/auth/change-password", { newPassword });
      // update local user to reflect firstLogin = false
      if (user) {
        const updated = { ...user, firstLogin: false };
        setUser(updated);
        localStorage.setItem(LS_USER, JSON.stringify(updated));
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  // ── Reset de contraseña (admin) ────────────────────────────────────────────
  const resetPassword = async (userId: string, newPassword: string) => {
    try {
      await apiPut(`/api/users/${userId}/reset-password`, { newPassword });
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
