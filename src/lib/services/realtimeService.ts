/**
 * Real-time Service - WebSocket/Live Collaboration Support
 * 
 * This service provides real-time updates using Supabase's built-in
 * real-time functionality for live collaboration features.
 */

import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RiskItem } from "@/types/domain";

export type RealtimeEventType = 
  | "risk_created" 
  | "risk_updated" 
  | "risk_deleted"
  | "resource_created"
  | "resource_updated" 
  | "resource_deleted"
  | "idea_updated"
  | "budget_updated";

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
  userId?: string;
}

export interface RealtimeCallbacks {
  onRiskChange?: (event: RealtimeEvent<RiskItem>) => void;
  onResourceChange?: (event: RealtimeEvent) => void;
  onIdeaChange?: (event: RealtimeEvent) => void;
  onBudgetChange?: (event: RealtimeEvent) => void;
  onUserJoin?: (userId: string) => void;
  onUserLeave?: (userId: string) => void;
  onError?: (error: Error) => void;
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: RealtimeCallbacks = {};
  private isConnected = false;

  /**
   * Subscribe to real-time updates for a specific idea
   */
  subscribeToIdea(ideaId: string, callbacks: RealtimeCallbacks): () => void {
    const channelName = `idea-${ideaId}`;
    
    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    console.log(`🔗 Subscribing to real-time updates for idea: ${ideaId}`);
    
    this.callbacks = { ...this.callbacks, ...callbacks };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "risks",
          filter: `idea_id=eq.${ideaId}`
        },
        (payload) => this.handleRiskChange(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public", 
          table: "resources",
          filter: `idea_id=eq.${ideaId}`
        },
        (payload) => this.handleResourceChange(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ideas",
          filter: `id=eq.${ideaId}`
        },
        (payload) => this.handleIdeaChange(payload)
      )
      .on(
        "presence",
        { event: "sync" },
        () => this.handlePresenceSync(channelName)
      )
      .on(
        "presence", 
        { event: "join" },
        ({ key, newPresences }) => this.handleUserJoin(key, newPresences)
      )
      .on(
        "presence",
        { event: "leave" },
        ({ key, leftPresences }) => this.handleUserLeave(key, leftPresences)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Real-time subscription active");
          this.isConnected = true;
          
          // Track user presence
          channel.track({
            user_id: "current-user", // TODO: Get from auth
            online_at: new Date().toISOString()
          });
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Real-time subscription error");
          this.callbacks.onError?.(new Error("Real-time subscription failed"));
        }
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to project-wide updates
   */
  subscribeToProject(projectId: string, callbacks: RealtimeCallbacks): () => void {
    const channelName = `project-${projectId}`;
    
    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    console.log(`🔗 Subscribing to project updates: ${projectId}`);
    
    this.callbacks = { ...this.callbacks, ...callbacks };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ideas",
          filter: `project_id=eq.${projectId}`
        },
        (payload) => this.handleIdeaChange(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "*", 
          schema: "public",
          table: "proposal_items"
        },
        (payload) => this.handleBudgetChange(payload)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Project real-time subscription active");
          this.isConnected = true;
        }
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  /**
   * Broadcast a custom event to other users
   */
  broadcast(channelName: string, event: RealtimeEvent): void {
    const channel = this.channels.get(channelName);
    if (!channel) {
      console.warn(`Channel ${channelName} not found for broadcast`);
      return;
    }

    channel.send({
      type: "broadcast",
      event: event.type,
      payload: {
        ...(typeof event.payload === 'object' && event.payload !== null ? event.payload : {}),
        timestamp: new Date().toISOString(),
        userId: "current-user" // TODO: Get from auth
      }
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`🔌 Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    console.log("🔌 Unsubscribing from all real-time channels");
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.isConnected = false;
  }

  /**
   * Handle risk table changes
   */
  private handleRiskChange(payload: any): void {
    console.log("🎯 Risk change detected:", payload);
    
    let eventType: RealtimeEventType;
    switch (payload.eventType) {
      case "INSERT":
        eventType = "risk_created";
        break;
      case "UPDATE":
        eventType = "risk_updated";
        break;
      case "DELETE":
        eventType = "risk_deleted";
        break;
      default:
        return;
    }

    const event: RealtimeEvent<RiskItem> = {
      type: eventType,
      payload: this.transformRiskFromDB(payload.new || payload.old),
      timestamp: new Date().toISOString()
    };

    this.callbacks.onRiskChange?.(event);
  }

  /**
   * Handle resource table changes
   */
  private handleResourceChange(payload: any): void {
    console.log("👥 Resource change detected:", payload);
    
    let eventType: RealtimeEventType;
    switch (payload.eventType) {
      case "INSERT":
        eventType = "resource_created";
        break;
      case "UPDATE":
        eventType = "resource_updated";
        break;
      case "DELETE":
        eventType = "resource_deleted";
        break;
      default:
        return;
    }

    const event: RealtimeEvent = {
      type: eventType,
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString()
    };

    this.callbacks.onResourceChange?.(event);
  }

  /**
   * Handle idea table changes
   */
  private handleIdeaChange(payload: any): void {
    console.log("💡 Idea change detected:", payload);
    
    const event: RealtimeEvent = {
      type: "idea_updated",
      payload: payload.new,
      timestamp: new Date().toISOString()
    };

    this.callbacks.onIdeaChange?.(event);
  }

  /**
   * Handle budget-related changes
   */
  private handleBudgetChange(payload: any): void {
    console.log("💰 Budget change detected:", payload);
    
    const event: RealtimeEvent = {
      type: "budget_updated", 
      payload: payload.new || payload.old,
      timestamp: new Date().toISOString()
    };

    this.callbacks.onBudgetChange?.(event);
  }

  /**
   * Handle presence sync
   */
  private handlePresenceSync(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      const presenceState = channel.presenceState();
      console.log(`👥 Presence sync for ${channelName}:`, presenceState);
    }
  }

  /**
   * Handle user joining
   */
  private handleUserJoin(key: string, presences: any[]): void {
    console.log("👋 User joined:", key, presences);
    this.callbacks.onUserJoin?.(key);
  }

  /**
   * Handle user leaving
   */
  private handleUserLeave(key: string, presences: any[]): void {
    console.log("👋 User left:", key, presences);
    this.callbacks.onUserLeave?.(key);
  }

  /**
   * Transform database risk format to application format
   */
  private transformRiskFromDB(dbRisk: any): RiskItem {
    if (!dbRisk) return {} as RiskItem;
    
    return {
      id: dbRisk.id,
      ideaId: dbRisk.idea_id,
      title: dbRisk.title,
      likelihood: parseFloat(dbRisk.likelihood) || 0.5,
      impact: parseFloat(dbRisk.impact) || 0.5,
      score: dbRisk.score,
      mitigation: dbRisk.mitigation,
      createdAt: dbRisk.created_at
    };
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

/**
 * React hook for easy real-time subscription
 */
export function useRealtimeIdea(ideaId: string, callbacks: RealtimeCallbacks) {
  const subscribe = () => realtimeService.subscribeToIdea(ideaId, callbacks);
  const unsubscribe = () => realtimeService.unsubscribeAll();
  
  return { subscribe, unsubscribe };
}

/**
 * React hook for project-wide real-time updates
 */
export function useRealtimeProject(projectId: string, callbacks: RealtimeCallbacks) {
  const subscribe = () => realtimeService.subscribeToProject(projectId, callbacks);
  const unsubscribe = () => realtimeService.unsubscribeAll();
  
  return { subscribe, unsubscribe };
}
