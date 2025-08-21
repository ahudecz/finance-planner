import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getLikelihoodText, getImpactText } from "@/lib/agent/riskRegister";

/**
 * GET /api/risks?ideaId=...
 * 
 * Retrieves risks for a specific idea, ordered by score descending
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get('ideaId');
    
    if (!ideaId) {
      return NextResponse.json(
        { error: "ideaId query parameter is required" },
        { status: 400 }
      );
    }

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(ideaId)) {
      return NextResponse.json(
        { error: "Invalid ideaId format" },
        { status: 400 }
      );
    }

    console.log("📋 Fetching risks for idea:", ideaId);

    const supabase = await createServerClient();
    
    // Fetch risks ordered by score descending
    const { data: risks, error } = await supabase
      .from('risks')
      .select('*')
      .eq('idea_id', ideaId)
      .order('score', { ascending: false });

    if (error) {
      console.error('Error fetching risks:', error);
      return NextResponse.json(
        { error: "Failed to fetch risks" },
        { status: 500 }
      );
    }

    // Transform risks to include descriptive text
    const transformedRisks = risks.map(risk => ({
      id: risk.id,
      ideaId: risk.idea_id,
      title: risk.title,
      likelihood: risk.likelihood,
      impact: risk.impact,
      score: risk.score,
      mitigation: risk.mitigation,
      createdAt: risk.created_at,
      // Add descriptive text for UI
      likelihoodText: getLikelihoodText(parseFloat(risk.likelihood)),
      impactText: getImpactText(parseFloat(risk.impact))
    }));

    console.log(`✅ Retrieved ${transformedRisks.length} risks for idea ${ideaId}`);

    return NextResponse.json({
      risks: transformedRisks,
      count: transformedRisks.length
    });

  } catch (error) {
    console.error("Error in risks API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
