import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { claudeAnalyst } from '@/lib/services/claudeService';

const AnalyzeRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  stage: z.enum(['vision', 'tasks', 'budget', 'timeline', 'resources', 'tech', 'security', 'risks']).optional().default('vision'),
  context: z.object({
    companySize: z.string().optional(),
    industry: z.string().optional(),
    budget: z.number().optional(),
    previousAnalysis: z.record(z.any()).optional()
  }).optional()
});

export interface AIAnalysisResult {
  stage: string;
  analysis: {
    vision?: {
      refined_description: string;
      key_objectives: string[];
      success_criteria: string[];
      clarifying_questions: string[];
    };
    tasks?: {
      task_breakdown: Array<{
        id: string;
        title: string;
        description: string;
        dependencies: string[];
        estimated_effort: number;
        priority: 'high' | 'medium' | 'low';
      }>;
      critical_path: string[];
      milestones: Array<{
        name: string;
        description: string;
        deliverables: string[];
      }>;
    };
    budget?: {
      capex: {
        total: number;
        breakdown: Array<{
          category: string;
          amount: number;
          description: string;
        }>;
      };
      opex: {
        monthly: number;
        annual: number;
        breakdown: Array<{
          category: string;
          monthly_amount: number;
          description: string;
        }>;
      };
      total_investment: number;
      roi_projection: {
        break_even_months: number;
        year_1_roi: number;
        year_3_roi: number;
      };
    };
    timeline?: {
      total_duration_weeks: number;
      phases: Array<{
        name: string;
        duration_weeks: number;
        start_week: number;
        key_activities: string[];
      }>;
      critical_dependencies: string[];
      risk_buffer_weeks: number;
    };
    resources?: {
      internal_roles: Array<{
        role: string;
        fte_percentage: number;
        duration_weeks: number;
        skills_required: string[];
      }>;
      external_roles: Array<{
        role: string;
        type: 'consultant' | 'contractor' | 'vendor';
        estimated_cost: number;
        duration_weeks: number;
        expertise_required: string[];
      }>;
      total_internal_cost: number;
      total_external_cost: number;
    };
    tech?: {
      infrastructure_requirements: Array<{
        component: string;
        specification: string;
        estimated_cost: number;
        criticality: 'essential' | 'important' | 'nice-to-have';
      }>;
      software_requirements: Array<{
        tool: string;
        purpose: string;
        licensing_cost: number;
        implementation_effort: number;
      }>;
      integration_complexity: 'low' | 'medium' | 'high';
      scalability_considerations: string[];
    };
    security?: {
      data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
      compliance_requirements: string[];
      security_controls: Array<{
        control: string;
        implementation_effort: 'low' | 'medium' | 'high';
        estimated_cost: number;
        priority: 'mandatory' | 'recommended' | 'optional';
      }>;
      privacy_considerations: string[];
      audit_requirements: string[];
    };
    risks?: {
      identified_risks: Array<{
        id: string;
        title: string;
        description: string;
        category: 'technical' | 'financial' | 'operational' | 'strategic' | 'compliance';
        probability: 'low' | 'medium' | 'high';
        impact: 'low' | 'medium' | 'high';
        risk_score: number;
        mitigation_strategies: string[];
        contingency_plans: string[];
      }>;
      overall_risk_level: 'low' | 'medium' | 'high';
      recommended_actions: string[];
    };
  };
  confidence_score: number;
  next_suggested_stage?: string;
  metadata: {
    processing_time_ms: number;
    model_version: string;
    analysis_timestamp: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedInput = AnalyzeRequestSchema.parse(body);
    const { prompt, stage, context } = validatedInput;

    console.log(`🤖 Starting Claude AI analysis - Stage: ${stage}, Prompt: ${prompt.substring(0, 100)}...`);

    // Use Claude for AI analysis
    const claudeResult = await claudeAnalyst.analyzeBusinessIdea({
      businessIdea: prompt,
      stage,
      context
    });

    const analysis = claudeResult.analysis;

    const result: AIAnalysisResult = {
      stage,
      analysis,
      confidence_score: claudeResult.confidence,
      next_suggested_stage: getNextStage(stage),
      metadata: {
        processing_time_ms: claudeResult.processingTime,
        model_version: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
        analysis_timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ AI analysis completed - Stage: ${stage}, Confidence: ${result.confidence_score}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ AI Analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during AI analysis' },
      { status: 500 }
    );
  }
}


function getNextStage(currentStage: string): string | undefined {
  const stageFlow = {
    'vision': 'tasks',
    'tasks': 'budget',
    'budget': 'timeline',
    'timeline': 'resources',
    'resources': 'tech',
    'tech': 'security',
    'security': 'risks',
    'risks': undefined
  };

  return stageFlow[currentStage as keyof typeof stageFlow];
}