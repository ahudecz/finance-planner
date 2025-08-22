import { AIAnalysisResult } from '@/app/api/ai/analyze/route';

export interface AIAnalysisContext {
  companySize?: string;
  industry?: string;
  budget?: number;
  previousAnalysis?: Record<string, any>;
}

export interface AIStageResult {
  stage: string;
  data: any;
  confidence: number;
  processingTime: number;
}

export interface AIAnalysisProgress {
  currentStage: string;
  completedStages: string[];
  totalStages: number;
  progress: number;
  results: Record<string, AIStageResult>;
  isComplete: boolean;
  error?: string;
}

export class AIAnalysisService {
  private readonly API_BASE = '/api/ai';
  private readonly ANALYSIS_STAGES = [
    'vision',
    'tasks', 
    'budget',
    'timeline',
    'resources',
    'tech',
    'security',
    'risks'
  ];

  async analyzePrompt(
    prompt: string,
    context?: AIAnalysisContext,
    onProgress?: (progress: AIAnalysisProgress) => void
  ): Promise<AIAnalysisProgress> {
    console.log('🚀 Starting comprehensive AI analysis...', { prompt: prompt.substring(0, 50) + '...' });

    const results: Record<string, AIStageResult> = {};
    const completedStages: string[] = [];
    let currentContext = { ...context };

    for (let i = 0; i < this.ANALYSIS_STAGES.length; i++) {
      const stage = this.ANALYSIS_STAGES[i];
      
      try {
        // Update progress
        const progress: AIAnalysisProgress = {
          currentStage: stage,
          completedStages: [...completedStages],
          totalStages: this.ANALYSIS_STAGES.length,
          progress: (i / this.ANALYSIS_STAGES.length) * 100,
          results: { ...results },
          isComplete: false
        };

        if (onProgress) {
          onProgress(progress);
        }

        console.log(`🔄 Processing stage: ${stage} (${i + 1}/${this.ANALYSIS_STAGES.length})`);

        // Perform analysis for this stage
        const stageResult = await this.analyzeSingleStage(prompt, stage, {
          ...currentContext,
          previousAnalysis: results
        });

        // Store result
        results[stage] = {
          stage,
          data: stageResult.analysis[stage as keyof typeof stageResult.analysis],
          confidence: stageResult.confidence_score,
          processingTime: stageResult.metadata.processing_time_ms
        };

        completedStages.push(stage);

        // Update context with new data for subsequent stages
        currentContext = {
          ...currentContext,
          previousAnalysis: results
        };

        console.log(`✅ Completed stage: ${stage}, confidence: ${stageResult.confidence_score}`);

      } catch (error) {
        console.error(`❌ Error in stage ${stage}:`, error);
        
        const errorProgress: AIAnalysisProgress = {
          currentStage: stage,
          completedStages,
          totalStages: this.ANALYSIS_STAGES.length,
          progress: (i / this.ANALYSIS_STAGES.length) * 100,
          results,
          isComplete: false,
          error: `Failed at stage: ${stage}`
        };

        if (onProgress) {
          onProgress(errorProgress);
        }
        
        throw new Error(`AI analysis failed at stage: ${stage}`);
      }
    }

    // Final progress update
    const finalProgress: AIAnalysisProgress = {
      currentStage: 'complete',
      completedStages,
      totalStages: this.ANALYSIS_STAGES.length,
      progress: 100,
      results,
      isComplete: true
    };

    if (onProgress) {
      onProgress(finalProgress);
    }

    console.log('🎉 AI analysis complete!', { stages: completedStages.length, totalTime: Object.values(results).reduce((sum, r) => sum + r.processingTime, 0) });

    return finalProgress;
  }

  async analyzeSingleStage(
    prompt: string,
    stage: string,
    context?: AIAnalysisContext
  ): Promise<AIAnalysisResult> {
    const response = await fetch(`${this.API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        stage,
        context
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AI analysis failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
    }

    return response.json();
  }

  async regenerateStage(
    prompt: string,
    stage: string,
    context?: AIAnalysisContext
  ): Promise<AIStageResult> {
    console.log(`🔄 Regenerating stage: ${stage}`);
    
    const result = await this.analyzeSingleStage(prompt, stage, context);
    
    return {
      stage,
      data: result.analysis[stage as keyof typeof result.analysis],
      confidence: result.confidence_score,
      processingTime: result.metadata.processing_time_ms
    };
  }

  getStageDescription(stage: string): string {
    const descriptions = {
      vision: 'Articulating and refining your business vision',
      tasks: 'Breaking down implementation into manageable tasks',
      budget: 'Calculating CAPEX and OPEX budget requirements',
      timeline: 'Estimating project timeline and milestones',
      resources: 'Identifying internal and external resource needs',
      tech: 'Assessing technical requirements and conditions',
      security: 'Evaluating data security and compliance needs',
      risks: 'Identifying and analyzing potential risks'
    };

    return descriptions[stage as keyof typeof descriptions] || `Processing ${stage}`;
  }

  isValidStage(stage: string): boolean {
    return this.ANALYSIS_STAGES.includes(stage);
  }

  getNextStage(currentStage: string): string | null {
    const currentIndex = this.ANALYSIS_STAGES.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === this.ANALYSIS_STAGES.length - 1) {
      return null;
    }
    return this.ANALYSIS_STAGES[currentIndex + 1];
  }

  getPreviousStage(currentStage: string): string | null {
    const currentIndex = this.ANALYSIS_STAGES.indexOf(currentStage);
    if (currentIndex <= 0) {
      return null;
    }
    return this.ANALYSIS_STAGES[currentIndex - 1];
  }
}

// Export singleton instance
export const aiService = new AIAnalysisService();