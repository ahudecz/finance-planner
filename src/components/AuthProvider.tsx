"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth, type AuthState, type Permission, type UserRole } from "@/lib/services/authService";

const AuthContext = createContext<AuthState & {
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signOut: () => Promise<any>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  updateProfile: (updates: any) => Promise<any>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}