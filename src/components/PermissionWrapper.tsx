"use client";

import React from "react";

interface PermissionWrapperProps {
  permission?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionWrapper({ 
  permission, 
  children, 
  fallback = null 
}: PermissionWrapperProps) {
  // For now, always show content - in production you'd check actual permissions
  const hasPermission = true; // TODO: Implement real permission check
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
