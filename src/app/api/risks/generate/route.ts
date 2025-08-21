import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateMockRisks, calculateRiskScore, getLikelihoodText, getImpactText } from "@/lib/agent/riskRegister";

/**
 * POST /api/risks/generate
 * 
 * Generates 3-5 risks for an idea based on its brief_json data
 * Inserts risks into the risks table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId } = body;

    if (!ideaId) {
      return NextResponse.json(
        { error: "ideaId is required" },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(ideaId)) {
      return NextResponse.json(
        { error: "Invalid ideaId format" },
        { status: 400 }
      );
    }

    console.log("🎲 Generating risks for idea:", ideaId);

    const supabase = await createServerClient();

    // First, fetch the idea to get brief_json
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('brief_json')
      .eq('id', ideaId)
      .single();

    if (ideaError) {
      console.error('Error fetching idea:', ideaError);
      return NextResponse.json(
        { error: "Idea not found" },
        { status: 404 }
      );
    }

    if (!idea) {
      return NextResponse.json(
        { error: "Idea not found" },
        { status: 404 }
      );
    }

    // Generate mock risks based on brief data
    const mockRisks = generateMockRisks(idea.brief_json);

    // Clear existing risks for this idea (regenerate scenario)
    const { error: deleteError } = await supabase
      .from('risks')
      .delete()
      .eq('idea_id', ideaId);

    if (deleteError) {
      console.error('Error clearing existing risks:', deleteError);
      // Continue anyway - we'll just have duplicates
    }

    // Convert mock risks to database format
    const risksToInsert = mockRisks.map(mockRisk => ({
      idea_id: ideaId,
      title: mockRisk.title,
      likelihood: getLikelihoodText(mockRisk.likelihood),
      impact: getImpactText(mockRisk.impact),
      score: calculateRiskScore(mockRisk.likelihood, mockRisk.impact),
      mitigation: mockRisk.mitigation || null
    }));

    // Insert risks into database
    const { data: insertedRisks, error: insertError } = await supabase
      .from('risks')
      .insert(risksToInsert)
      .select('*');

    if (insertError) {
      console.error('Error inserting risks:', insertError);
      return NextResponse.json(
        { error: "Failed to generate risks" },
        { status: 500 }
      );
    }

    // Transform inserted risks for response (same format as GET endpoint)
    const transformedRisks = insertedRisks.map(risk => ({
      id: risk.id,
      ideaId: risk.idea_id,
      title: risk.title,
      likelihood: risk.likelihood,
      impact: risk.impact,
      score: risk.score,
      mitigation: risk.mitigation,
      createdAt: risk.created_at,
      // Add descriptive text for consistency
      likelihoodText: risk.likelihood,
      impactText: risk.impact
    }));

    console.log(`✅ Generated ${transformedRisks.length} risks for idea ${ideaId}`);

    return NextResponse.json({
      success: true,
      risks: transformedRisks,
      count: transformedRisks.length,
      message: `Generated ${transformedRisks.length} risks based on company profile`
    });

  } catch (error) {
    console.error("Error in risk generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
