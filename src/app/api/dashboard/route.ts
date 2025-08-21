import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { selectBudgetTotals } from "@/lib/budget/selectors";
import { getCompany, getOrgSize } from "@/lib/brief";
import type { DashboardData } from "@/lib/services/dashboardService";

export async function GET(request: NextRequest) {
  try {
    const serverClient = await createServerClient();
    
    // Try to get existing project
    const { data: projects, error: projectError } = await serverClient
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (projectError) {
      console.error('Error fetching projects:', projectError);
      return NextResponse.json({
        companyName: "Demo Company",
        companySize: "20-200 FTEs",
        capex: 10000,
        opex: 200,
        timeline: 15,
        savings: 10000,
        currentIdeaId: "550e8400-e29b-41d4-a716-446655440000"
      });
    }

    if (projects && projects.length > 0) {
      const project = projects[0];
      
      // Fetch associated ideas
      const { data: ideas, error: ideasError } = await serverClient
        .from('ideas')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (ideas && ideas.length > 0) {
        const latestIdea = ideas[0];
        const company = getCompany(latestIdea.brief_json);
        const orgSize = getOrgSize(latestIdea.brief_json);
        
        // Calculate budget totals
        try {
          const budgetTotals = await selectBudgetTotals(latestIdea.id);
          
          const dashboardData: DashboardData = {
            companyName: company?.name || "Unknown Company",
            companySize: orgSize || "Unknown",
            capex: budgetTotals.capex,
            opex: budgetTotals.opexMonthly,
            timeline: 15, // Mock for now
            savings: Math.round((budgetTotals.capex + budgetTotals.opexMonthly * 12) * 0.15),
            currentIdeaId: latestIdea.id,
            projectId: project.id
          };

          return NextResponse.json(dashboardData);
        } catch (budgetError) {
          console.error('Error calculating budget:', budgetError);
          // Fallback to basic data
          return NextResponse.json({
            companyName: company?.name || "Unknown Company",
            companySize: orgSize || "Unknown",
            capex: 0,
            opex: 0,
            timeline: 15,
            savings: 0,
            currentIdeaId: latestIdea.id,
            projectId: project.id
          });
        }
      }
    }

    // Create new default project if none exists
    const { data: newProject, error: createError } = await serverClient
      .from('projects')
      .insert({
        title: 'Default Project',
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating project:', createError);
    }

    // Return demo data
    return NextResponse.json({
      companyName: "Demo Company (New Project)",
      companySize: "20-200 FTEs",
      capex: 0,
      opex: 0,
      timeline: 0,
      savings: 0,
      currentIdeaId: "550e8400-e29b-41d4-a716-446655440000",
      projectId: newProject?.id
    });

  } catch (error) {
    console.error('Error in dashboard API:', error);
    
    // Return fallback demo data
    return NextResponse.json({
      companyName: "Demo Company (Fallback)",
      companySize: "20-200 FTEs", 
      capex: 10000,
      opex: 200,
      timeline: 15,
      savings: 10000,
      currentIdeaId: "550e8400-e29b-41d4-a716-446655440000"
    });
  }
}
