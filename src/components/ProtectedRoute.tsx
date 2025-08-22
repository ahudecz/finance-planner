"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/services/authService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  requiredPermission?: string;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  requiredPermission,
  fallbackPath = "/auth/login"
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      router.push(fallbackPath);
      return;
    }

    if (requiredRole && !hasRole(requiredRole as any)) {
      router.push("/unauthorized");
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission as any)) {
      router.push("/unauthorized");
      return;
    }
  }, [isAuthenticated, isLoading, requiredRole, requiredPermission, hasRole, hasPermission, router, requireAuth, fallbackPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requiredRole && !hasRole(requiredRole as any)) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission as any)) {
    return null;
  }

  return <>{children}</>;
}