/**
 * Dashboard Service - Real Data Integration
 * 
 * This service handles all dashboard data operations with Supabase,
 * replacing mock data with real database queries.
 */

import { supabase } from "@/lib/supabase/client";

import { getCompany, getOrgSize } from "@/lib/brief";
import type { Company, OrgSize, RiskItem } from "@/types/domain";

export interface DashboardData {
  companyName?: string;
  companySize?: string;
  capex: number;
  opex: number;
  timeline: number;
  savings: number;
  currentIdeaId?: string;
  projectId?: string;
}

export interface ProjectData {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  ideas: IdeaData[];
}

export interface IdeaData {
  id: string;
  projectId: string;
  briefJson: Record<string, unknown>;
  createdAt: string;
  company?: Company;
  orgSize: OrgSize;
  risks: RiskItem[];
}

/**
 * Get or create a default project for the current user
 */
export async function getOrCreateDefaultProject(): Promise<ProjectData | null> {
  try {
    // Use client-side supabase for now - in production you'd want proper auth
    // Try to get existing project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (projectError) {
      console.error('Error fetching projects:', projectError);
      return null;
    }

    if (projects && projects.length > 0) {
      // Return existing project
      const project = projects[0];
      
      // Fetch associated ideas
      const { data: ideas, error: ideasError } = await supabase
        .from('ideas')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (ideasError) {
        console.error('Error fetching ideas:', ideasError);
        return null;
      }

      return {
        id: project.id,
        title: project.title,
        status: project.status,
        createdAt: project.created_at,
        ideas: ideas?.map(idea => ({
          id: idea.id,
          projectId: idea.project_id,
          briefJson: idea.brief_json || {},
          createdAt: idea.created_at,
          company: getCompany(idea.brief_json),
          orgSize: getOrgSize(idea.brief_json),
          risks: [] // Will be loaded separately
        })) || []
      };
    }

    // Create new default project
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        title: 'Default Project',
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating project:', createError);
      return null;
    }

    return {
      id: newProject.id,
      title: newProject.title,
      status: newProject.status,
      createdAt: newProject.created_at,
      ideas: []
    };

  } catch (error) {
    console.error('Error in getOrCreateDefaultProject:', error);
    return null;
  }
}

/**
 * Create a new idea with company and size information
 */
export async function createIdea(
  projectId: string,
  companyData: Company,
  orgSize: OrgSize
): Promise<IdeaData | null> {
  try {
    const briefJson = {
      company: companyData,
      size_band: orgSize,
      created_at: new Date().toISOString()
    };

    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({
        project_id: projectId,
        brief_json: briefJson
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating idea:', error);
      return null;
    }

    return {
      id: idea.id,
      projectId: idea.project_id,
      briefJson: idea.brief_json,
      createdAt: idea.created_at,
      company: companyData,
      orgSize,
      risks: []
    };

  } catch (error) {
    console.error('Error in createIdea:', error);
    return null;
  }
}

/**
 * Update an existing idea
 */
export async function updateIdea(
  ideaId: string,
  updates: {
    company?: Company;
    orgSize?: OrgSize;
    briefJson?: Record<string, unknown>;
  }
): Promise<IdeaData | null> {
  try {
    // Get current idea
    const { data: currentIdea, error: fetchError } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .single();

    if (fetchError || !currentIdea) {
      console.error('Error fetching idea for update:', fetchError);
      return null;
    }

    // Merge updates with existing data
    const updatedBriefJson = {
      ...currentIdea.brief_json,
      ...updates.briefJson,
      ...(updates.company && { company: updates.company }),
      ...(updates.orgSize && { size_band: updates.orgSize }),
      updated_at: new Date().toISOString()
    };

    const { data: updatedIdea, error: updateError } = await supabase
      .from('ideas')
      .update({ brief_json: updatedBriefJson })
      .eq('id', ideaId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating idea:', updateError);
      return null;
    }

    return {
      id: updatedIdea.id,
      projectId: updatedIdea.project_id,
      briefJson: updatedIdea.brief_json,
      createdAt: updatedIdea.created_at,
      company: getCompany(updatedIdea.brief_json),
      orgSize: getOrgSize(updatedIdea.brief_json),
      risks: []
    };

  } catch (error) {
    console.error('Error in updateIdea:', error);
    return null;
  }
}

/**
 * Delete an idea and all associated data
 */
export async function deleteIdea(ideaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', ideaId);

    if (error) {
      console.error('Error deleting idea:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error in deleteIdea:', error);
    return false;
  }
}

/**
 * Load comprehensive dashboard data for a project
 */
export async function loadDashboardData(projectId?: string): Promise<DashboardData> {
  try {
    // Get project data
    const project = projectId 
      ? await getProjectById(projectId)
      : await getOrCreateDefaultProject();

    if (!project || project.ideas.length === 0) {
      // Return default mock data if no real data exists
      return {
        companyName: "No Company Set",
        companySize: "Unknown",
        capex: 0,
        opex: 0,
        timeline: 0,
        savings: 0,
        currentIdeaId: undefined,
        projectId: project?.id
      };
    }

    // Use the most recent idea
    const latestIdea = project.ideas[0];
    
    // Calculate timeline (mock for now)
    const timeline = calculateProjectTimeline(latestIdea);
    
    // For now, return mock budget data since we can't use server-side selectors
    // In production, you'd want to call the API endpoint instead
    const mockCapex = 10000;
    const mockOpex = 200;
    const savings = calculateProjectSavings(mockCapex, mockOpex);

    return {
      companyName: latestIdea.company?.name || "Unknown Company",
      companySize: latestIdea.orgSize || "Unknown",
      capex: mockCapex,
      opex: mockOpex,
      timeline,
      savings,
      currentIdeaId: latestIdea.id,
      projectId: project.id
    };

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    
    // Return fallback data
    return {
      companyName: "Error Loading Data",
      companySize: "Unknown",
      capex: 0,
      opex: 0,
      timeline: 0,
      savings: 0
    };
  }
}

/**
 * Get project by ID with associated ideas
 */
async function getProjectById(projectId: string): Promise<ProjectData | null> {
  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return null;
    }

    const { data: ideas, error: ideasError } = await supabase
      .from('ideas')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (ideasError) {
      console.error('Error fetching ideas:', ideasError);
      return null;
    }

    return {
      id: project.id,
      title: project.title,
      status: project.status,
      createdAt: project.created_at,
      ideas: ideas?.map(idea => ({
        id: idea.id,
        projectId: idea.project_id,
        briefJson: idea.brief_json || {},
        createdAt: idea.created_at,
        company: getCompany(idea.brief_json),
        orgSize: getOrgSize(idea.brief_json),
        risks: []
      })) || []
    };

  } catch (error) {
    console.error('Error in getProjectById:', error);
    return null;
  }
}

/**
 * Calculate project timeline based on idea complexity
 */
function calculateProjectTimeline(idea: IdeaData): number {
  // Mock calculation based on company size and complexity
  const baseTimeline = 10; // days
  
  switch (idea.orgSize) {
    case "<20": return baseTimeline;
    case "20–200": return baseTimeline + 5;
    case "200–1k": return baseTimeline + 10;
    case "1k–10k": return baseTimeline + 15;
    case ">10k": return baseTimeline + 20;
    default: return baseTimeline;
  }
}

/**
 * Calculate potential savings based on budget
 */
function calculateProjectSavings(capex: number, opex: number): number {
  // Mock calculation: assume 15% efficiency savings
  const annualOpex = opex * 12;
  const totalBudget = capex + annualOpex;
  return Math.round(totalBudget * 0.15);
}

/**
 * Process chat idea submission and create/update idea
 */
export async function processIdeaSubmission(
  ideaText: string,
  projectId?: string
): Promise<{ ideaId: string; success: boolean; message: string }> {
  try {
    // Get or create project
    const project = projectId 
      ? await getProjectById(projectId)
      : await getOrCreateDefaultProject();

    if (!project) {
      return {
        ideaId: '',
        success: false,
        message: 'Failed to create or access project'
      };
    }

    // Parse idea text to extract company information (basic parsing)
    const companyName = extractCompanyName(ideaText);
    const company: Company = {
      name: companyName || 'Unknown Company',
      domain: '',
      linkedinUrl: '',
      privacyRedaction: false
    };

    // Create new idea
    const newIdea = await createIdea(project.id, company, 'Unknown');
    
    if (!newIdea) {
      return {
        ideaId: '',
        success: false,
        message: 'Failed to create idea'
      };
    }

    return {
      ideaId: newIdea.id,
      success: true,
      message: `Created new idea for ${company.name}`
    };

  } catch (error) {
    console.error('Error processing idea submission:', error);
    return {
      ideaId: '',
      success: false,
      message: 'Error processing idea submission'
    };
  }
}

/**
 * Extract company name from idea text (basic implementation)
 */
function extractCompanyName(ideaText: string): string | null {
  // Look for patterns like "for [Company Name]" or "[Company Name] needs"
  const patterns = [
    /for\s+([A-Z][a-zA-Z\s&.]+?)(?:\s|$|,|\.)/,
    /([A-Z][a-zA-Z\s&.]+?)\s+(?:needs|wants|requires|is)/,
    /help\s+([A-Z][a-zA-Z\s&.]+?)(?:\s|$|,|\.)/
  ];

  for (const pattern of patterns) {
    const match = ideaText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}
