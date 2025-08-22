import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OpenAIAnalysisRequest {
  businessIdea: string;
  stage: 'vision' | 'tasks' | 'budget' | 'timeline' | 'resources' | 'tech' | 'security' | 'risks';
  context?: {
    companySize?: string;
    industry?: string;
    previousAnalysis?: Record<string, any>;
  };
}

export interface OpenAIThinking {
  currentThought: string;
  reasoning: string;
  confidence: number;
  nextSteps: string[];
  uncertainties: string[];
  assumptions: string[];
  toolsConsidered: string[];
}

export interface OpenAIAnalysisResult {
  thinking: OpenAIThinking;
  analysis: any;
  calculations?: Array<{
    description: string;
    formula: string;
    inputs: Record<string, number>;
    result: number;
    explanation: string;
  }>;
  confidence: number;
  processingTime: number;
}

export class OpenAIBusinessAnalyst {
  private model: string;

  constructor() {
    // Set model preference - will automatically use GPT-5 when available
    this.model = this.getBestAvailableModel();
    console.log(`🤖 OpenAI Business Analyst using model: ${this.model}`);
  }

  private getBestAvailableModel(): string {
    // Check if user specified a model in environment
    const userPreferredModel = process.env.OPENAI_MODEL;
    
    if (userPreferredModel) {
      console.log(`🎯 Using user-specified model: ${userPreferredModel}`);
      return userPreferredModel;
    }
    
    // Future-ready: Will use GPT-5 when it becomes available
    const preferredModels = [
      "gpt-5",              // Future model - not yet available
      "gpt-4o",             // Latest GPT-4 variant (faster, multimodal)  
      "gpt-4-turbo",        // Current best for complex analysis
      "gpt-4-turbo-preview", // Fallback option
      "gpt-4"               // Final fallback
    ];

    // For now, return the best currently available model
    // TODO: Add model availability checking when OpenAI provides API for this
    return "gpt-4o"; // Using GPT-4o as the best current option
  }
  
  async analyzeBusinessIdea(request: OpenAIAnalysisRequest): Promise<OpenAIAnalysisResult> {
    const startTime = Date.now();
    
    console.log(`🤖 OpenAI Analysis (${this.model}) - Stage: ${request.stage}, Idea: ${request.businessIdea.substring(0, 50)}...`);

    const systemPrompt = this.getSystemPrompt(request.stage);
    const userPrompt = this.buildUserPrompt(request);

    try {
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(response);
      const processingTime = Date.now() - startTime;

      console.log(`✅ OpenAI Analysis (${this.model}) completed - Stage: ${request.stage}, Confidence: ${parsed.thinking?.confidence || 0.8}`);

      return {
        thinking: parsed.thinking,
        analysis: parsed.analysis,
        calculations: parsed.calculations,
        confidence: parsed.thinking?.confidence || 0.8,
        processingTime
      };

    } catch (error) {
      console.error(`❌ OpenAI Analysis (${this.model}) failed - Stage: ${request.stage}:`, error);
      
      // If GPT-4o fails, try fallback to GPT-4-turbo
      if (this.model === "gpt-4o") {
        console.log('🔄 Falling back to GPT-4-turbo...');
        this.model = "gpt-4-turbo";
        return this.analyzeBusinessIdea(request); // Retry with fallback model
      }
      
      throw new Error(`OpenAI analysis failed with ${this.model}: ${error}`);
    }
  }

  private getSystemPrompt(stage: string): string {
    const basePrompt = `You are an experienced business analyst with Claude Code's transparent reasoning approach. 

CRITICAL: You must always respond with valid JSON in this exact format:
{
  "thinking": {
    "currentThought": "What I'm thinking right now...",
    "reasoning": "My detailed reasoning process...",
    "confidence": 0.85,
    "nextSteps": ["step1", "step2"],
    "uncertainties": ["what I'm unsure about"],
    "assumptions": ["what I'm assuming"],
    "toolsConsidered": ["tools I used in my analysis"]
  },
  "analysis": { ... stage-specific analysis ... },
  "calculations": [
    {
      "description": "What this calculates",
      "formula": "mathematical formula",
      "inputs": {"var1": 100, "var2": 200},
      "result": 300,
      "explanation": "why this calculation makes sense"
    }
  ]
}

Be transparent about your thinking process like Claude Code. Show your work, admit uncertainties, and explain your reasoning step by step.`;

    const stagePrompts = {
      vision: `${basePrompt}

For VISION analysis, focus on:
- Refining the business concept
- Identifying key value propositions
- Understanding target users
- Clarifying success criteria

Your "analysis" should include:
{
  "refined_description": "clear business description",
  "key_objectives": ["objective1", "objective2"],
  "success_criteria": ["criteria1", "criteria2"],
  "clarifying_questions": ["question1", "question2"],
  "target_users": ["user type 1", "user type 2"],
  "value_propositions": ["value prop 1", "value prop 2"]
}`,

      budget: `${basePrompt}

For BUDGET analysis, provide detailed financial breakdown:

Your "analysis" should include:
{
  "capex": {
    "total": 75000,
    "breakdown": [
      {"category": "Development", "amount": 50000, "description": "reasoning"},
      {"category": "Infrastructure", "amount": 25000, "description": "reasoning"}
    ]
  },
  "opex": {
    "monthly": 8500,
    "annual": 102000,
    "breakdown": [
      {"category": "Hosting", "monthly_amount": 3000, "description": "reasoning"}
    ]
  },
  "roi_projection": {
    "break_even_months": 14,
    "year_1_roi": -15,
    "year_3_roi": 180
  }
}

Include detailed calculations showing your math.`,

      timeline: `${basePrompt}

For TIMELINE analysis, break down the implementation schedule:

Your "analysis" should include:
{
  "total_duration_weeks": 18,
  "phases": [
    {
      "name": "Planning & Design",
      "duration_weeks": 4,
      "start_week": 1,
      "key_activities": ["activity1", "activity2"]
    }
  ],
  "critical_path": ["milestone1", "milestone2"],
  "risk_buffer_weeks": 2,
  "dependencies": ["dependency1", "dependency2"]
}`,

      resources: `${basePrompt}

For RESOURCES analysis, identify team and external needs:

Your "analysis" should include:
{
  "internal_roles": [
    {
      "role": "Project Manager",
      "fte_percentage": 50,
      "duration_weeks": 18,
      "skills_required": ["skill1", "skill2"]
    }
  ],
  "external_roles": [
    {
      "role": "Senior Developer",
      "type": "contractor",
      "estimated_cost": 120000,
      "duration_weeks": 16
    }
  ],
  "total_internal_cost": 85000,
  "total_external_cost": 175000
}`,

      tech: `${basePrompt}

For TECHNICAL analysis, assess technology requirements:

Your "analysis" should include:
{
  "infrastructure_requirements": [
    {
      "component": "Cloud Platform",
      "specification": "AWS with auto-scaling",
      "estimated_cost": 3000,
      "criticality": "essential"
    }
  ],
  "software_requirements": [
    {
      "tool": "Development Framework",
      "purpose": "Web application development",
      "licensing_cost": 0,
      "implementation_effort": 2
    }
  ],
  "integration_complexity": "medium",
  "scalability_considerations": ["consideration1", "consideration2"]
}`,

      security: `${basePrompt}

For SECURITY analysis, evaluate data protection needs:

Your "analysis" should include:
{
  "data_classification": "confidential",
  "compliance_requirements": ["GDPR", "SOC 2"],
  "security_controls": [
    {
      "control": "Multi-Factor Authentication",
      "implementation_effort": "medium",
      "estimated_cost": 5000,
      "priority": "mandatory"
    }
  ],
  "privacy_considerations": ["consideration1"],
  "audit_requirements": ["requirement1"]
}`,

      risks: `${basePrompt}

For RISK analysis, identify and assess potential issues:

Your "analysis" should include:
{
  "identified_risks": [
    {
      "id": "risk-1",
      "title": "Risk Title",
      "description": "Risk description",
      "category": "technical",
      "probability": "medium",
      "impact": "high",
      "risk_score": 75,
      "mitigation_strategies": ["strategy1"],
      "contingency_plans": ["plan1"]
    }
  ],
  "overall_risk_level": "medium",
  "recommended_actions": ["action1", "action2"]
}`
    };

    return stagePrompts[stage as keyof typeof stagePrompts] || basePrompt;
  }

  private buildUserPrompt(request: OpenAIAnalysisRequest): string {
    let prompt = `Business Idea: "${request.businessIdea}"

Analysis Stage: ${request.stage.toUpperCase()}

Please analyze this business idea for the ${request.stage} stage. `;

    if (request.context?.companySize) {
      prompt += `Company Size: ${request.context.companySize}. `;
    }

    if (request.context?.industry) {
      prompt += `Industry: ${request.context.industry}. `;
    }

    if (request.context?.previousAnalysis) {
      prompt += `Previous Analysis Context: ${JSON.stringify(request.context.previousAnalysis, null, 2)}. `;
    }

    prompt += `

IMPORTANT REQUIREMENTS:
1. Show your thinking process transparently like Claude Code
2. Be specific with numbers and calculations 
3. Admit what you're uncertain about
4. Explain your assumptions clearly
5. Provide actionable insights
6. Use realistic market-based estimates
7. Include confidence levels for your decisions
8. Respond ONLY with valid JSON format

Think step by step and show your reasoning!`;

    return prompt;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: `Hello! Please respond with a simple JSON: {"status": "connected", "model": "${this.model}", "ready_for_gpt5": true}` }],
        response_format: { type: "json_object" },
        max_tokens: 100
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      console.log(`✅ OpenAI connection test successful with ${this.model}:`, result);
      return true;
    } catch (error) {
      console.error(`❌ OpenAI connection test failed with ${this.model}:`, error);
      
      // Try fallback model for connection test
      if (this.model === "gpt-4o") {
        console.log('🔄 Testing connection with fallback model...');
        try {
          const fallbackResponse = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: `Hello! Please respond with a simple JSON: {"status": "connected", "model": "gpt-4-turbo", "fallback": true}` }],
            response_format: { type: "json_object" },
            max_tokens: 100
          });
          
          const fallbackResult = JSON.parse(fallbackResponse.choices[0].message.content || '{}');
          console.log('✅ OpenAI fallback connection successful:', fallbackResult);
          this.model = "gpt-4-turbo"; // Switch to working model
          return true;
        } catch (fallbackError) {
          console.error('❌ Fallback connection also failed:', fallbackError);
        }
      }
      
      return false;
    }
  }
}

export const openaiAnalyst = new OpenAIBusinessAnalyst();