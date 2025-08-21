/**
 * Authentication & User Management Service
 * 
 * This service provides comprehensive user authentication,
 * authorization, and permission management using Supabase Auth.
 */

import React from "react";
import { supabase } from "@/lib/supabase/client";
import { createServerClient } from "@/lib/supabase/server";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "manager" | "analyst" | "viewer";
export type Permission = 
  | "create_projects" 
  | "edit_projects" 
  | "delete_projects"
  | "create_ideas"
  | "edit_ideas"
  | "delete_ideas"
  | "manage_risks"
  | "view_budget"
  | "edit_budget"
  | "export_data"
  | "manage_users"
  | "view_analytics";

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[];
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  settings: {
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    defaultRole: UserRole;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "create_projects", "edit_projects", "delete_projects",
    "create_ideas", "edit_ideas", "delete_ideas",
    "manage_risks", "view_budget", "edit_budget",
    "export_data", "manage_users", "view_analytics"
  ],
  manager: [
    "create_projects", "edit_projects",
    "create_ideas", "edit_ideas",
    "manage_risks", "view_budget", "edit_budget",
    "export_data", "view_analytics"
  ],
  analyst: [
    "create_ideas", "edit_ideas",
    "manage_risks", "view_budget",
    "export_data"
  ],
  viewer: [
    "view_budget", "export_data"
  ]
};

class AuthService {
  private currentUser: User | null = null;
  private currentProfile: UserProfile | null = null;
  private listeners: Array<(authState: AuthState) => void> = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize auth service and set up listeners
   */
  private async initialize(): Promise<void> {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error);
        return;
      }

      if (session?.user) {
        this.currentUser = session.user;
        this.currentProfile = await this.fetchUserProfile(session.user.id);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", event);
        
        if (session?.user) {
          this.currentUser = session.user;
          this.currentProfile = await this.fetchUserProfile(session.user.id);
          
          // Update last login
          if (event === "SIGNED_IN") {
            await this.updateLastLogin(session.user.id);
          }
        } else {
          this.currentUser = null;
          this.currentProfile = null;
        }

        this.notifyListeners();
      });

    } catch (error) {
      console.error("Error initializing auth service:", error);
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(
    email: string, 
    password: string, 
    userData: {
      fullName?: string;
      organizationId?: string;
      role?: UserRole;
    }
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName,
            organization_id: userData.organizationId,
            role: userData.role || "viewer"
          }
        }
      });

      if (error) {
        return { user: null, error };
      }

      // Create user profile
      if (data.user) {
        await this.createUserProfile(data.user.id, {
          email: data.user.email!,
          fullName: userData.fullName,
          role: userData.role || "viewer",
          organizationId: userData.organizationId,
          isActive: true
        });
      }

      return { user: data.user, error: null };

    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign in user
   */
  async signIn(
    email: string, 
    password: string
  ): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };

    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current user profile
   */
  getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: Permission): boolean {
    if (!this.currentProfile) return false;
    return this.currentProfile.permissions.includes(permission);
  }

  /**
   * Check if user has specific role or higher
   */
  hasRole(requiredRole: UserRole): boolean {
    if (!this.currentProfile) return false;
    
    const roleHierarchy: UserRole[] = ["viewer", "analyst", "manager", "admin"];
    const userRoleIndex = roleHierarchy.indexOf(this.currentProfile.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    return userRoleIndex >= requiredRoleIndex;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    updates: Partial<Pick<UserProfile, "fullName" | "avatarUrl" | "role">>
  ): Promise<{ profile: UserProfile | null; error: Error | null }> {
    if (!this.currentUser) {
      return { profile: null, error: new Error("No authenticated user") };
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", this.currentUser.id)
        .select()
        .single();

      if (error) {
        return { profile: null, error };
      }

      const updatedProfile = this.transformProfileFromDB(data);
      this.currentProfile = updatedProfile;
      this.notifyListeners();

      return { profile: updatedProfile, error: null };

    } catch (error) {
      return { profile: null, error: error as Error };
    }
  }

  /**
   * Invite user to organization
   */
  async inviteUser(
    email: string,
    role: UserRole,
    organizationId: string
  ): Promise<{ success: boolean; error: Error | null }> {
    if (!this.hasPermission("manage_users")) {
      return { success: false, error: new Error("Insufficient permissions") };
    }

    try {
      // Create invitation record
      const { error: inviteError } = await supabase
        .from("user_invitations")
        .insert({
          email,
          role,
          organization_id: organizationId,
          invited_by: this.currentUser?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (inviteError) {
        return { success: false, error: inviteError };
      }

      // TODO: Send invitation email
      console.log(`Invitation sent to ${email} for role ${role}`);

      return { success: true, error: null };

    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get organization users
   */
  async getOrganizationUsers(organizationId: string): Promise<UserProfile[]> {
    if (!this.hasPermission("manage_users")) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching organization users:", error);
        return [];
      }

      return data?.map(this.transformProfileFromDB) || [];

    } catch (error) {
      console.error("Error in getOrganizationUsers:", error);
      return [];
    }
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (authState: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Send initial state
    listener(this.getAuthState());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current auth state
   */
  private getAuthState(): AuthState {
    return {
      user: this.currentUser,
      profile: this.currentProfile,
      session: null, // TODO: Get current session
      isLoading: false,
      isAuthenticated: !!this.currentUser
    };
  }

  /**
   * Notify all listeners of auth state changes
   */
  private notifyListeners(): void {
    const authState = this.getAuthState();
    this.listeners.forEach(listener => listener(authState));
  }

  /**
   * Fetch user profile from database
   */
  private async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      return this.transformProfileFromDB(data);

    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      return null;
    }
  }

  /**
   * Create user profile in database
   */
  private async createUserProfile(
    userId: string,
    profileData: Omit<UserProfile, "id" | "permissions" | "createdAt" | "updatedAt">
  ): Promise<void> {
    try {
      const permissions = ROLE_PERMISSIONS[profileData.role];
      
      await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          email: profileData.email,
          full_name: profileData.fullName,
          avatar_url: profileData.avatarUrl,
          role: profileData.role,
          permissions,
          organization_id: profileData.organizationId,
          is_active: profileData.isActive
        });

    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from("user_profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating last login:", error);
    }
  }

  /**
   * Transform database profile to application format
   */
  private transformProfileFromDB(dbProfile: any): UserProfile {
    return {
      id: dbProfile.id,
      email: dbProfile.email,
      fullName: dbProfile.full_name,
      avatarUrl: dbProfile.avatar_url,
      role: dbProfile.role,
      permissions: dbProfile.permissions || ROLE_PERMISSIONS[dbProfile.role as UserRole] || [],
      organizationId: dbProfile.organization_id,
      createdAt: dbProfile.created_at,
      updatedAt: dbProfile.updated_at,
      lastLoginAt: dbProfile.last_login_at,
      isActive: dbProfile.is_active
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

/**
 * React hook for auth state
 */
export function useAuth() {
  const [authState, setAuthState] = React.useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false
  });

  React.useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  return {
    ...authState,
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    hasPermission: authService.hasPermission.bind(authService),
    hasRole: authService.hasRole.bind(authService),
    updateProfile: authService.updateProfile.bind(authService)
  };
}

/**
 * Permission guard component
 */
export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null 
}: { 
  permission: Permission; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  const hasPermission = authService.hasPermission(permission);
  return hasPermission ? React.createElement(React.Fragment, null, children) : React.createElement(React.Fragment, null, fallback);
}

/**
 * Role guard component
 */
export function RoleGuard({ 
  role, 
  children, 
  fallback = null 
}: { 
  role: UserRole; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  const hasRole = authService.hasRole(role);
  return hasRole ? React.createElement(React.Fragment, null, children) : React.createElement(React.Fragment, null, fallback);
}
