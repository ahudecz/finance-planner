/**
 * CRUD Service - Complete Create, Read, Update, Delete Operations
 * 
 * This service provides comprehensive CRUD operations for all entities
 * in the finance planner application.
 */

import { supabase } from "@/lib/supabase/client";
import type { Company, OrgSize, RiskItem } from "@/types/domain";

// Extended interfaces for CRUD operations
export interface Resource {
  id: string;
  ideaId: string;
  type: "internal" | "external";
  title: string;
  duration: number; // in days
  cost?: number; // per day for external resources
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalRequirement {
  id: string;
  ideaId: string;
  title: string;
  type: "hardware" | "software" | "security" | "infrastructure";
  description?: string;
  quantity?: number;
  status: "required" | "recommended" | "optional";
  fulfilled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  kind: "budget" | "timeline" | "role-internal" | "role-external" | "tech" | "security" | "risk";
  contentJson: Record<string, unknown>;
  costNum?: number;
  effortDays?: number;
  confidence?: number;
  acceptedBool?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * RESOURCES CRUD OPERATIONS
 */

export async function createResource(
  ideaId: string,
  resourceData: Omit<Resource, "id" | "createdAt" | "updatedAt">
): Promise<Resource | null> {
  try {
    const { data, error } = await supabase
      .from("resources")
      .insert({
        idea_id: ideaId,
        type: resourceData.type,
        title: resourceData.title,
        duration: resourceData.duration,
        cost: resourceData.cost,
        description: resourceData.description,
        status: resourceData.status
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating resource:", error);
      return null;
    }

    return transformResourceFromDB(data);
  } catch (error) {
    console.error("Error in createResource:", error);
    return null;
  }
}

export async function getResources(ideaId: string): Promise<Resource[]> {
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("idea_id", ideaId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching resources:", error);
      return [];
    }

    return data?.map(transformResourceFromDB) || [];
  } catch (error) {
    console.error("Error in getResources:", error);
    return [];
  }
}

export async function updateResource(
  resourceId: string,
  updates: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>
): Promise<Resource | null> {
  try {
    const { data, error } = await supabase
      .from("resources")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", resourceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating resource:", error);
      return null;
    }

    return transformResourceFromDB(data);
  } catch (error) {
    console.error("Error in updateResource:", error);
    return null;
  }
}

export async function deleteResource(resourceId: string): Promise<boolean> {
  try {
    // Soft delete by setting status to inactive
    const { error } = await supabase
      .from("resources")
      .update({ 
        status: "inactive",
        updated_at: new Date().toISOString()
      })
      .eq("id", resourceId);

    if (error) {
      console.error("Error deleting resource:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteResource:", error);
    return false;
  }
}

/**
 * TECHNICAL REQUIREMENTS CRUD OPERATIONS
 */

export async function createTechnicalRequirement(
  ideaId: string,
  requirementData: Omit<TechnicalRequirement, "id" | "createdAt" | "updatedAt">
): Promise<TechnicalRequirement | null> {
  try {
    const { data, error } = await supabase
      .from("technical_requirements")
      .insert({
        idea_id: ideaId,
        title: requirementData.title,
        type: requirementData.type,
        description: requirementData.description,
        quantity: requirementData.quantity,
        status: requirementData.status,
        fulfilled: requirementData.fulfilled
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating technical requirement:", error);
      return null;
    }

    return transformTechnicalRequirementFromDB(data);
  } catch (error) {
    console.error("Error in createTechnicalRequirement:", error);
    return null;
  }
}

export async function getTechnicalRequirements(ideaId: string): Promise<TechnicalRequirement[]> {
  try {
    const { data, error } = await supabase
      .from("technical_requirements")
      .select("*")
      .eq("idea_id", ideaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching technical requirements:", error);
      return [];
    }

    return data?.map(transformTechnicalRequirementFromDB) || [];
  } catch (error) {
    console.error("Error in getTechnicalRequirements:", error);
    return [];
  }
}

export async function updateTechnicalRequirement(
  requirementId: string,
  updates: Partial<Omit<TechnicalRequirement, "id" | "createdAt" | "updatedAt">>
): Promise<TechnicalRequirement | null> {
  try {
    const { data, error } = await supabase
      .from("technical_requirements")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", requirementId)
      .select()
      .single();

    if (error) {
      console.error("Error updating technical requirement:", error);
      return null;
    }

    return transformTechnicalRequirementFromDB(data);
  } catch (error) {
    console.error("Error in updateTechnicalRequirement:", error);
    return null;
  }
}

export async function deleteTechnicalRequirement(requirementId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("technical_requirements")
      .delete()
      .eq("id", requirementId);

    if (error) {
      console.error("Error deleting technical requirement:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteTechnicalRequirement:", error);
    return false;
  }
}

/**
 * PROPOSAL ITEMS CRUD OPERATIONS
 */

export async function createProposalItem(
  proposalId: string,
  itemData: Omit<ProposalItem, "id" | "createdAt" | "updatedAt">
): Promise<ProposalItem | null> {
  try {
    const { data, error } = await supabase
      .from("proposal_items")
      .insert({
        proposal_id: proposalId,
        kind: itemData.kind,
        content_json: itemData.contentJson,
        cost_num: itemData.costNum,
        effort_days: itemData.effortDays,
        confidence: itemData.confidence,
        accepted_bool: itemData.acceptedBool,
        notes: itemData.notes
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating proposal item:", error);
      return null;
    }

    return transformProposalItemFromDB(data);
  } catch (error) {
    console.error("Error in createProposalItem:", error);
    return null;
  }
}

export async function getProposalItems(proposalId: string): Promise<ProposalItem[]> {
  try {
    const { data, error } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching proposal items:", error);
      return [];
    }

    return data?.map(transformProposalItemFromDB) || [];
  } catch (error) {
    console.error("Error in getProposalItems:", error);
    return [];
  }
}

export async function updateProposalItem(
  itemId: string,
  updates: Partial<Omit<ProposalItem, "id" | "createdAt" | "updatedAt">>
): Promise<ProposalItem | null> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.kind !== undefined) dbUpdates.kind = updates.kind;
    if (updates.contentJson !== undefined) dbUpdates.content_json = updates.contentJson;
    if (updates.costNum !== undefined) dbUpdates.cost_num = updates.costNum;
    if (updates.effortDays !== undefined) dbUpdates.effort_days = updates.effortDays;
    if (updates.confidence !== undefined) dbUpdates.confidence = updates.confidence;
    if (updates.acceptedBool !== undefined) dbUpdates.accepted_bool = updates.acceptedBool;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase
      .from("proposal_items")
      .update(dbUpdates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      console.error("Error updating proposal item:", error);
      return null;
    }

    return transformProposalItemFromDB(data);
  } catch (error) {
    console.error("Error in updateProposalItem:", error);
    return null;
  }
}

export async function deleteProposalItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("proposal_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error deleting proposal item:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteProposalItem:", error);
    return false;
  }
}

/**
 * RISKS CRUD OPERATIONS (Enhanced)
 */

export async function createRisk(
  ideaId: string,
  riskData: Omit<RiskItem, "id" | "createdAt">
): Promise<RiskItem | null> {
  try {
    const { data, error } = await supabase
      .from("risks")
      .insert({
        idea_id: ideaId,
        title: riskData.title,
        likelihood: riskData.likelihood.toString(),
        impact: riskData.impact.toString(),
        score: riskData.score,
        mitigation: riskData.mitigation
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating risk:", error);
      return null;
    }

    return transformRiskFromDB(data);
  } catch (error) {
    console.error("Error in createRisk:", error);
    return null;
  }
}

export async function updateRisk(
  riskId: string,
  updates: Partial<Omit<RiskItem, "id" | "createdAt">>
): Promise<RiskItem | null> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.likelihood !== undefined) dbUpdates.likelihood = updates.likelihood.toString();
    if (updates.impact !== undefined) dbUpdates.impact = updates.impact.toString();
    if (updates.score !== undefined) dbUpdates.score = updates.score;
    if (updates.mitigation !== undefined) dbUpdates.mitigation = updates.mitigation;

    const { data, error } = await supabase
      .from("risks")
      .update(dbUpdates)
      .eq("id", riskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating risk:", error);
      return null;
    }

    return transformRiskFromDB(data);
  } catch (error) {
    console.error("Error in updateRisk:", error);
    return null;
  }
}

export async function deleteRisk(riskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("risks")
      .delete()
      .eq("id", riskId);

    if (error) {
      console.error("Error deleting risk:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteRisk:", error);
    return false;
  }
}

/**
 * TRANSFORM FUNCTIONS - Convert DB format to application format
 */

function transformResourceFromDB(dbResource: any): Resource {
  return {
    id: dbResource.id,
    ideaId: dbResource.idea_id,
    type: dbResource.type,
    title: dbResource.title,
    duration: dbResource.duration,
    cost: dbResource.cost,
    description: dbResource.description,
    status: dbResource.status,
    createdAt: dbResource.created_at,
    updatedAt: dbResource.updated_at
  };
}

function transformTechnicalRequirementFromDB(dbRequirement: any): TechnicalRequirement {
  return {
    id: dbRequirement.id,
    ideaId: dbRequirement.idea_id,
    title: dbRequirement.title,
    type: dbRequirement.type,
    description: dbRequirement.description,
    quantity: dbRequirement.quantity,
    status: dbRequirement.status,
    fulfilled: dbRequirement.fulfilled,
    createdAt: dbRequirement.created_at,
    updatedAt: dbRequirement.updated_at
  };
}

function transformProposalItemFromDB(dbItem: any): ProposalItem {
  return {
    id: dbItem.id,
    proposalId: dbItem.proposal_id,
    kind: dbItem.kind,
    contentJson: dbItem.content_json,
    costNum: dbItem.cost_num,
    effortDays: dbItem.effort_days,
    confidence: dbItem.confidence,
    acceptedBool: dbItem.accepted_bool,
    notes: dbItem.notes,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at || dbItem.created_at
  };
}

function transformRiskFromDB(dbRisk: any): RiskItem {
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
