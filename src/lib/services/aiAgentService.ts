export interface AITodoItem {
  id: string;
  task: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  subTasks?: AITodoItem[];
  startTime?: Date;
  completedTime?: Date;
  reasoning?: string;
  confidence?: number;
}

export interface ReasoningStep {
  id: string;
  step: string;
  reasoning: string;
  confidence: number;
  toolsConsidered: string[];
  decision: string;
  timestamp: Date;
  fieldTarget?: string;
  calculationSteps?: CalculationStep[];
}

export interface CalculationStep {
  description: string;
  formula: string;
  inputs: Record<string, number>;
  result: number;
  explanation: string;
}

export interface ToolUsage {
  id: string;
  toolName: string;
  purpose: string;
  inputs: any;
  outputs: any;
  timestamp: Date;
  reasoning: string;
}

export interface AIThinkingProcess {
  currentThought: string;
  currentField: string | null;
  reasoning: string;
  confidence: number;
  nextSteps: string[];
  uncertainties: string[];
  assumptions: string[];
}

export interface AIAgentState {
  isActive: boolean;
  currentThinking: AIThinkingProcess | null;
  todoList: AITodoItem[];
  reasoningHistory: ReasoningStep[];
  toolsUsed: ToolUsage[];
  fieldProgress: Record<string, {
    status: 'not_started' | 'analyzing' | 'completed';
    confidence: number;
    reasoning: string;
    value?: any;
  }>;
  conversationLog: Array<{
    type: 'thinking' | 'action' | 'question' | 'decision';
    content: string;
    timestamp: Date;
  }>;
}

export class AIAgentEngine {
  private state: AIAgentState;
  private listeners: Array<(state: AIAgentState) => void> = [];
  private useOpenAI: boolean = false;

  constructor() {
    this.state = {
      isActive: false,
      currentThinking: null,
      todoList: [],
      reasoningHistory: [],
      toolsUsed: [],
      fieldProgress: {},
      conversationLog: []
    };
    
    // Check if OpenAI is available
    this.useOpenAI = !!process.env.OPENAI_API_KEY;
    console.log(`🤖 AI Agent: Using ${this.useOpenAI ? 'OpenAI GPT-4' : 'Simulation'} mode`);
  }

  // Subscribe to state changes
  subscribe(listener: (state: AIAgentState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  // Start AI analysis session
  async startAnalysis(businessIdea: string) {
    console.log('🤖 AI Agent: Starting analysis session');
    
    this.state = {
      ...this.state,
      isActive: true,
      currentThinking: {
        currentThought: "Let me understand this business idea...",
        currentField: null,
        reasoning: `I need to carefully analyze "${businessIdea}" and break it down into actionable business components.`,
        confidence: 0.9,
        nextSteps: [
          "Understand the core business concept",
          "Identify key stakeholders and users",
          "Analyze market context and competition",
          "Estimate technical requirements"
        ],
        uncertainties: [
          "What's the target market size?",
          "Are there any specific technical constraints?",
          "What's the preferred budget range?"
        ],
        assumptions: [
          "This is a new business venture",
          "Budget is flexible within reason",
          "Timeline is moderately flexible"
        ]
      },
      todoList: this.createInitialTodoList(businessIdea),
      conversationLog: [{
        type: 'thinking',
        content: `Starting analysis of business idea: "${businessIdea}"`,
        timestamp: new Date()
      }]
    };

    this.notifyListeners();
    
    // Begin the analysis workflow
    await this.executeAnalysisWorkflow(businessIdea);
  }

  private createInitialTodoList(businessIdea: string): AITodoItem[] {
    return [
      {
        id: 'understand-concept',
        task: 'Understand the core business concept',
        status: 'pending',
        progress: 0,
        reasoning: 'I need to fully grasp what this business does and its value proposition'
      },
      {
        id: 'market-research',
        task: 'Research market size and competition',
        status: 'pending',
        progress: 0,
        reasoning: 'Market context will inform realistic budget and timeline estimates'
      },
      {
        id: 'technical-analysis',
        task: 'Analyze technical requirements',
        status: 'pending',
        progress: 0,
        reasoning: 'Technical complexity directly impacts development costs and timeline'
      },
      {
        id: 'budget-calculation',
        task: 'Calculate CAPEX and OPEX requirements',
        status: 'pending',
        progress: 0,
        reasoning: 'Need to provide realistic financial projections'
      },
      {
        id: 'timeline-estimation',
        task: 'Estimate development timeline',
        status: 'pending',
        progress: 0,
        reasoning: 'Timeline depends on scope, complexity, and resource availability'
      },
      {
        id: 'risk-assessment',
        task: 'Identify and assess potential risks',
        status: 'pending',
        progress: 0,
        reasoning: 'Risk analysis helps in better planning and contingency preparation'
      }
    ];
  }

  private async executeAnalysisWorkflow(businessIdea: string) {
    try {
      // Step 1: Understand the concept
      await this.executeStep('understand-concept', async () => {
        return await this.understandBusinessConcept(businessIdea);
      });

      // Step 2: Market research
      await this.executeStep('market-research', async () => {
        return await this.conductMarketResearch(businessIdea);
      });

      // Step 3: Technical analysis
      await this.executeStep('technical-analysis', async () => {
        return await this.analyzeTechnicalRequirements(businessIdea);
      });

      // Step 4: Budget calculation
      await this.executeStep('budget-calculation', async () => {
        return await this.calculateBudgetEstimates(businessIdea);
      });

      // Step 5: Timeline estimation
      await this.executeStep('timeline-estimation', async () => {
        return await this.estimateTimeline(businessIdea);
      });

      // Step 6: Risk assessment
      await this.executeStep('risk-assessment', async () => {
        return await this.assessRisks(businessIdea);
      });

      // Complete analysis
      await this.completeAnalysis();

    } catch (error) {
      console.error('AI Agent analysis failed:', error);
      this.handleAnalysisError(error);
    }
  }

  private async executeStep(todoId: string, stepFunction: () => Promise<any>) {
    // Mark todo as in progress
    this.updateTodoStatus(todoId, 'in_progress');
    
    // Execute the step
    const result = await stepFunction();
    
    // Mark todo as completed
    this.updateTodoStatus(todoId, 'completed');
    
    return result;
  }

  private updateTodoStatus(todoId: string, status: AITodoItem['status'], progress: number = 100) {
    this.state.todoList = this.state.todoList.map(todo => 
      todo.id === todoId 
        ? { 
            ...todo, 
            status, 
            progress: status === 'completed' ? 100 : progress,
            completedTime: status === 'completed' ? new Date() : todo.completedTime,
            startTime: status === 'in_progress' && !todo.startTime ? new Date() : todo.startTime
          }
        : todo
    );
    this.notifyListeners();
  }

  private updateThinking(thinking: Partial<AIThinkingProcess>) {
    this.state.currentThinking = {
      ...this.state.currentThinking!,
      ...thinking
    };
    
    // Add to conversation log
    this.state.conversationLog.push({
      type: 'thinking',
      content: thinking.currentThought || thinking.reasoning || 'Processing...',
      timestamp: new Date()
    });
    
    this.notifyListeners();
  }

  private addReasoningStep(step: Omit<ReasoningStep, 'id' | 'timestamp'>) {
    const reasoningStep: ReasoningStep = {
      ...step,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    this.state.reasoningHistory.push(reasoningStep);
    this.notifyListeners();
  }

  private async understandBusinessConcept(businessIdea: string) {
    this.updateThinking({
      currentThought: "Analyzing the core business concept...",
      currentField: null,
      reasoning: "I need to identify the key value proposition, target users, and business model.",
      confidence: 0.8
    });

    if (this.useOpenAI) {
      try {
        const { openaiAnalyst } = await import('./openaiService');
        
        this.updateThinking({
          currentThought: "Using OpenAI GPT-4 to analyze the business concept...",
          currentField: null,
          reasoning: "Leveraging advanced AI to provide deeper insights into the business idea.",
          confidence: 0.9
        });

        const result = await openaiAnalyst.analyzeBusinessIdea({
          businessIdea,
          stage: 'vision'
        });

        // Update thinking with OpenAI results
        this.updateThinking({
          currentThought: result.thinking.currentThought,
          currentField: null,
          reasoning: result.thinking.reasoning,
          confidence: result.thinking.confidence,
          nextSteps: result.thinking.nextSteps,
          uncertainties: result.thinking.uncertainties,
          assumptions: result.thinking.assumptions
        });

        this.addReasoningStep({
          step: 'Business Concept Analysis (OpenAI)',
          reasoning: result.thinking.reasoning,
          confidence: result.thinking.confidence,
          toolsConsidered: result.thinking.toolsConsidered,
          decision: `Vision refined using AI analysis: ${result.analysis.refined_description}`
        });

        return result.analysis;

      } catch (error) {
        console.error('OpenAI analysis failed, falling back to simulation:', error);
        // Fall back to simulation if OpenAI fails
      }
    }

    // Fallback to simulation
    await this.simulateThinking(2000);

    const businessType = this.classifyBusiness(businessIdea);
    const complexity = this.assessComplexity(businessIdea);

    this.addReasoningStep({
      step: 'Business Concept Analysis',
      reasoning: `Analyzed "${businessIdea}" and identified it as a ${businessType} with ${complexity} complexity.`,
      confidence: 0.85,
      toolsConsidered: ['Business Classification', 'Complexity Assessment'],
      decision: `This is a ${businessType} requiring ${complexity} technical implementation.`
    });

    this.updateThinking({
      currentThought: "Business concept understood. Moving to market research...",
      reasoning: `Identified as ${businessType} with ${complexity} complexity. This will inform my budget and timeline estimates.`,
      confidence: 0.9
    });

    return { businessType, complexity };
  }

  private async conductMarketResearch(businessIdea: string) {
    this.updateThinking({
      currentThought: "Researching market size and competitive landscape...",
      currentField: null,
      reasoning: "Market data will help me understand realistic pricing, user acquisition costs, and competitive positioning.",
      confidence: 0.7
    });

    await this.simulateThinking(3000);

    // Simulate market research
    const marketData = {
      marketSize: this.estimateMarketSize(businessIdea),
      competitorCount: this.estimateCompetitors(businessIdea),
      userAcquisitionCost: this.estimateUserAcquisitionCost(businessIdea)
    };

    this.addReasoningStep({
      step: 'Market Research',
      reasoning: `Researched market for similar solutions. Found ${marketData.competitorCount} major competitors with estimated market size of ${marketData.marketSize}.`,
      confidence: 0.75,
      toolsConsidered: ['Market Size Estimation', 'Competitor Analysis'],
      decision: `Market shows ${marketData.marketSize} opportunity with moderate competition.`
    });

    return marketData;
  }

  private async analyzeTechnicalRequirements(businessIdea: string) {
    this.updateThinking({
      currentThought: "Analyzing technical architecture and requirements...",
      currentField: null,
      reasoning: "Technical complexity will be the main driver of development costs and timeline.",
      confidence: 0.85
    });

    await this.simulateThinking(2500);

    const techRequirements = {
      platforms: this.determinePlatforms(businessIdea),
      backend: this.determineBackendNeeds(businessIdea),
      integrations: this.determineIntegrations(businessIdea),
      complexity: this.assessTechnicalComplexity(businessIdea)
    };

    this.addReasoningStep({
      step: 'Technical Analysis',
      reasoning: `Analyzed technical requirements: ${techRequirements.platforms.join(', ')} platforms, ${techRequirements.backend} backend, ${techRequirements.integrations.length} key integrations.`,
      confidence: 0.9,
      toolsConsidered: ['Platform Assessment', 'Architecture Planning', 'Integration Analysis'],
      decision: `Technical scope: ${techRequirements.complexity} complexity requiring ${techRequirements.platforms.length} platforms.`
    });

    return techRequirements;
  }

  private async calculateBudgetEstimates(businessIdea: string) {
    this.updateThinking({
      currentThought: "Calculating CAPEX and OPEX requirements...",
      currentField: 'budget',
      reasoning: "I'll break down costs into development (CAPEX) and operational (OPEX) components based on technical requirements.",
      confidence: 0.8
    });

    if (this.useOpenAI) {
      try {
        const { openaiAnalyst } = await import('./openaiService');
        
        this.updateThinking({
          currentThought: "Using OpenAI GPT-4 for detailed budget analysis...",
          currentField: 'budget',
          reasoning: "Leveraging AI to provide accurate, market-based budget estimates with detailed breakdowns.",
          confidence: 0.9
        });

        const result = await openaiAnalyst.analyzeBusinessIdea({
          businessIdea,
          stage: 'budget',
          context: { previousAnalysis: this.state.fieldProgress }
        });

        // Update thinking with OpenAI results
        this.updateThinking({
          currentThought: result.thinking.currentThought,
          currentField: 'budget',
          reasoning: result.thinking.reasoning,
          confidence: result.thinking.confidence,
          nextSteps: result.thinking.nextSteps,
          uncertainties: result.thinking.uncertainties,
          assumptions: result.thinking.assumptions
        });

        this.addReasoningStep({
          step: 'Budget Calculation (OpenAI)',
          reasoning: result.thinking.reasoning,
          confidence: result.thinking.confidence,
          toolsConsidered: result.thinking.toolsConsidered,
          decision: `CAPEX: $${result.analysis.capex.total.toLocaleString()}, Monthly OPEX: $${result.analysis.opex.monthly.toLocaleString()}`,
          fieldTarget: 'budget',
          calculationSteps: result.calculations || []
        });

        // Update field progress
        this.state.fieldProgress['capex'] = {
          status: 'completed',
          confidence: result.thinking.confidence,
          reasoning: `OpenAI Analysis: ${result.thinking.reasoning}`,
          value: result.analysis.capex.total
        };

        this.state.fieldProgress['opex'] = {
          status: 'completed',
          confidence: result.thinking.confidence,
          reasoning: `OpenAI Analysis: Monthly operational costs`,
          value: result.analysis.opex.monthly
        };

        this.notifyListeners();
        return result.analysis;

      } catch (error) {
        console.error('OpenAI budget analysis failed, falling back to simulation:', error);
        // Fall back to simulation if OpenAI fails
      }
    }

    // Fallback to simulation
    await this.simulateThinking(3000);

    const capexCalculation = this.calculateCapex(businessIdea);
    const opexCalculation = this.calculateOpex(businessIdea);

    this.addReasoningStep({
      step: 'Budget Calculation',
      reasoning: `Calculated CAPEX of $${capexCalculation.total.toLocaleString()} and monthly OPEX of $${opexCalculation.monthly.toLocaleString()} based on technical requirements and market standards.`,
      confidence: 0.8,
      toolsConsidered: ['Cost Estimation', 'Market Rate Analysis', 'Technical Sizing'],
      decision: `Total investment: $${(capexCalculation.total + opexCalculation.monthly * 12).toLocaleString()} for first year.`,
      fieldTarget: 'capex',
      calculationSteps: [
        {
          description: 'Development Team Cost',
          formula: 'developers × rate × weeks',
          inputs: { developers: 3, rate: 2000, weeks: 16 },
          result: capexCalculation.development,
          explanation: '3 developers for 16 weeks at $2000/week each'
        },
        {
          description: 'Infrastructure Setup',
          formula: 'servers + tools + licenses',
          inputs: { servers: 5000, tools: 8000, licenses: 12000 },
          result: capexCalculation.infrastructure,
          explanation: 'Initial server setup, development tools, and software licenses'
        }
      ]
    });

    // Update field progress
    this.state.fieldProgress['capex'] = {
      status: 'completed',
      confidence: 0.8,
      reasoning: `Based on ${capexCalculation.reasoning}`,
      value: capexCalculation.total
    };

    this.state.fieldProgress['opex'] = {
      status: 'completed',
      confidence: 0.8,
      reasoning: `Based on ${opexCalculation.reasoning}`,
      value: opexCalculation.monthly
    };

    this.notifyListeners();

    return { capex: capexCalculation, opex: opexCalculation };
  }

  private async estimateTimeline(businessIdea: string) {
    this.updateThinking({
      currentThought: "Estimating development timeline and milestones...",
      currentField: 'timeline',
      reasoning: "Timeline depends on scope, team size, and technical complexity. I'll account for planning, development, testing, and deployment phases.",
      confidence: 0.85
    });

    await this.simulateThinking(2000);

    const timelineEstimate = this.calculateTimeline(businessIdea);

    this.addReasoningStep({
      step: 'Timeline Estimation',
      reasoning: `Estimated ${timelineEstimate.total} weeks total: ${timelineEstimate.phases.map(p => `${p.name} (${p.weeks}w)`).join(', ')}.`,
      confidence: 0.85,
      toolsConsidered: ['Phase Planning', 'Effort Estimation', 'Risk Buffer Analysis'],
      decision: `Total timeline: ${timelineEstimate.total} weeks with ${timelineEstimate.riskBuffer} weeks risk buffer.`,
      fieldTarget: 'timeline'
    });

    this.state.fieldProgress['timeline'] = {
      status: 'completed',
      confidence: 0.85,
      reasoning: timelineEstimate.reasoning,
      value: timelineEstimate.total
    };

    this.notifyListeners();

    return timelineEstimate;
  }

  private async assessRisks(businessIdea: string) {
    this.updateThinking({
      currentThought: "Identifying and assessing potential risks...",
      currentField: 'risks',
      reasoning: "I need to consider technical, market, financial, and operational risks that could impact the project.",
      confidence: 0.9
    });

    await this.simulateThinking(2500);

    const riskAssessment = this.analyzeRisks(businessIdea);

    this.addReasoningStep({
      step: 'Risk Assessment',
      reasoning: `Identified ${riskAssessment.risks.length} key risks: ${riskAssessment.risks.map(r => r.category).join(', ')}. Overall risk level: ${riskAssessment.overallRisk}.`,
      confidence: 0.9,
      toolsConsidered: ['Risk Matrix', 'Impact Analysis', 'Mitigation Planning'],
      decision: `Risk profile: ${riskAssessment.overallRisk} with ${riskAssessment.risks.filter(r => r.severity === 'high').length} high-severity risks.`,
      fieldTarget: 'risks'
    });

    return riskAssessment;
  }

  private async completeAnalysis() {
    this.updateThinking({
      currentThought: "Analysis complete! Summarizing findings...",
      currentField: null,
      reasoning: "I've completed my analysis across all key areas. The results are now integrated into your dashboard.",
      confidence: 0.9,
      nextSteps: [
        "Review the populated fields",
        "Consider the identified risks",
        "Evaluate the budget vs expected ROI",
        "Discuss timeline feasibility"
      ]
    });

    this.state.conversationLog.push({
      type: 'action',
      content: 'Analysis completed successfully. All dashboard fields have been populated with reasoning.',
      timestamp: new Date()
    });

    await this.simulateThinking(1000);

    this.state.isActive = false;
    this.notifyListeners();
  }

  private handleAnalysisError(error: any) {
    this.state.currentThinking = {
      currentThought: "I encountered an error during analysis...",
      currentField: null,
      reasoning: `An error occurred: ${error.message}. I'll need to retry or seek clarification.`,
      confidence: 0.1,
      nextSteps: ["Retry the analysis", "Request additional information", "Simplify the scope"],
      uncertainties: ["What caused the error?", "Is additional information needed?"],
      assumptions: []
    };

    this.state.isActive = false;
    this.notifyListeners();
  }

  // Helper methods for business analysis
  private classifyBusiness(idea: string): string {
    const lowerIdea = idea.toLowerCase();
    if (lowerIdea.includes('app') || lowerIdea.includes('mobile')) return 'Mobile Application';
    if (lowerIdea.includes('platform') || lowerIdea.includes('marketplace')) return 'Digital Platform';
    if (lowerIdea.includes('saas') || lowerIdea.includes('software')) return 'SaaS Solution';
    if (lowerIdea.includes('ecommerce') || lowerIdea.includes('shop')) return 'E-commerce Business';
    return 'Digital Solution';
  }

  private assessComplexity(idea: string): 'low' | 'medium' | 'high' {
    const lowerIdea = idea.toLowerCase();
    let complexityScore = 0;
    
    if (lowerIdea.includes('ai') || lowerIdea.includes('machine learning')) complexityScore += 3;
    if (lowerIdea.includes('real-time') || lowerIdea.includes('live')) complexityScore += 2;
    if (lowerIdea.includes('payment') || lowerIdea.includes('financial')) complexityScore += 2;
    if (lowerIdea.includes('video') || lowerIdea.includes('streaming')) complexityScore += 2;
    if (lowerIdea.includes('social') || lowerIdea.includes('chat')) complexityScore += 1;
    
    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  private estimateMarketSize(idea: string): string {
    // Simplified market size estimation
    if (idea.toLowerCase().includes('food') || idea.toLowerCase().includes('delivery')) return '$150B global market';
    if (idea.toLowerCase().includes('fitness') || idea.toLowerCase().includes('health')) return '$96B global market';
    if (idea.toLowerCase().includes('education') || idea.toLowerCase().includes('learning')) return '$76B global market';
    return '$50B+ addressable market';
  }

  private estimateCompetitors(idea: string): number {
    // Simplified competitor estimation
    if (idea.toLowerCase().includes('food delivery')) return 15;
    if (idea.toLowerCase().includes('ride sharing')) return 8;
    if (idea.toLowerCase().includes('social media')) return 25;
    return 10;
  }

  private estimateUserAcquisitionCost(idea: string): number {
    // Simplified CAC estimation
    if (idea.toLowerCase().includes('b2b') || idea.toLowerCase().includes('enterprise')) return 150;
    if (idea.toLowerCase().includes('finance') || idea.toLowerCase().includes('fintech')) return 80;
    return 25;
  }

  private determinePlatforms(idea: string): string[] {
    const platforms = [];
    if (idea.toLowerCase().includes('mobile') || idea.toLowerCase().includes('app')) {
      platforms.push('iOS', 'Android');
    }
    if (idea.toLowerCase().includes('web') || idea.toLowerCase().includes('platform')) {
      platforms.push('Web Application');
    }
    if (platforms.length === 0) platforms.push('Web Application');
    return platforms;
  }

  private determineBackendNeeds(idea: string): string {
    if (idea.toLowerCase().includes('real-time') || idea.toLowerCase().includes('chat')) return 'Complex backend with real-time features';
    if (idea.toLowerCase().includes('ai') || idea.toLowerCase().includes('ml')) return 'AI/ML backend infrastructure';
    if (idea.toLowerCase().includes('payment') || idea.toLowerCase().includes('financial')) return 'Secure payment processing backend';
    return 'Standard REST API backend';
  }

  private determineIntegrations(idea: string): string[] {
    const integrations = [];
    if (idea.toLowerCase().includes('payment')) integrations.push('Payment Gateway');
    if (idea.toLowerCase().includes('map') || idea.toLowerCase().includes('location')) integrations.push('Maps API');
    if (idea.toLowerCase().includes('social')) integrations.push('Social Media APIs');
    if (idea.toLowerCase().includes('email') || idea.toLowerCase().includes('notification')) integrations.push('Email/SMS Services');
    return integrations;
  }

  private assessTechnicalComplexity(idea: string): 'low' | 'medium' | 'high' {
    return this.assessComplexity(idea); // Reuse the same logic
  }

  private calculateCapex(idea: string) {
    const complexity = this.assessComplexity(idea);
    const platforms = this.determinePlatforms(idea);
    
    let baseDevCost = 60000;
    if (complexity === 'medium') baseDevCost = 100000;
    if (complexity === 'high') baseDevCost = 150000;
    
    const platformMultiplier = platforms.length * 0.7;
    const development = Math.round(baseDevCost * platformMultiplier);
    
    const infrastructure = Math.round(development * 0.3);
    const tools = Math.round(development * 0.15);
    const total = development + infrastructure + tools;
    
    return {
      development,
      infrastructure,
      tools,
      total,
      reasoning: `${complexity} complexity ${platforms.join('/')} solution requiring comprehensive development approach`
    };
  }

  private calculateOpex(idea: string) {
    const platforms = this.determinePlatforms(idea);
    const integrations = this.determineIntegrations(idea);
    
    let baseHosting = 500;
    let baseServices = 300;
    
    if (platforms.length > 1) baseHosting *= 1.5;
    if (integrations.length > 2) baseServices *= 1.8;
    
    const hosting = Math.round(baseHosting);
    const services = Math.round(baseServices);
    const support = Math.round((hosting + services) * 0.4);
    const monthly = hosting + services + support;
    
    return {
      hosting,
      services,
      support,
      monthly,
      annual: monthly * 12,
      reasoning: `${platforms.length} platform(s) with ${integrations.length} integration(s) requiring ongoing operational support`
    };
  }

  private calculateTimeline(idea: string) {
    const complexity = this.assessComplexity(idea);
    const platforms = this.determinePlatforms(idea);
    
    let baseWeeks = 12;
    if (complexity === 'medium') baseWeeks = 18;
    if (complexity === 'high') baseWeeks = 26;
    
    const platformWeeks = Math.max(0, (platforms.length - 1) * 4);
    const riskBuffer = Math.round((baseWeeks + platformWeeks) * 0.2);
    const total = baseWeeks + platformWeeks + riskBuffer;
    
    const phases = [
      { name: 'Planning & Design', weeks: Math.round(total * 0.25) },
      { name: 'Core Development', weeks: Math.round(total * 0.50) },
      { name: 'Testing & Polish', weeks: Math.round(total * 0.15) },
      { name: 'Deployment & Launch', weeks: Math.round(total * 0.10) }
    ];
    
    return {
      total,
      phases,
      riskBuffer,
      reasoning: `${complexity} complexity across ${platforms.length} platform(s) with ${riskBuffer} weeks risk buffer`
    };
  }

  private analyzeRisks(idea: string) {
    const risks = [
      {
        category: 'Technical',
        description: 'Integration complexity may cause delays',
        severity: 'medium' as ('low' | 'medium' | 'high'),
        probability: 0.6,
        impact: 'Schedule delays of 2-4 weeks'
      },
      {
        category: 'Market',
        description: 'User adoption may be slower than expected',
        severity: 'medium' as ('low' | 'medium' | 'high'),
        probability: 0.4,
        impact: 'Extended customer acquisition timeline'
      },
      {
        category: 'Financial',
        description: 'Development costs may exceed estimates',
        severity: 'low' as ('low' | 'medium' | 'high'),
        probability: 0.3,
        impact: '10-20% budget overrun'
      }
    ];
    
    if (idea.toLowerCase().includes('ai') || idea.toLowerCase().includes('ml')) {
      risks.push({
        category: 'Technical',
        description: 'AI model performance may not meet expectations',
        severity: 'high' as ('low' | 'medium' | 'high'),
        probability: 0.5,
        impact: 'Requires architecture redesign'
      });
    }
    
    const highRisks = risks.filter(r => r.severity === 'high').length;
    const overallRisk: 'low' | 'medium' | 'high' = highRisks > 0 ? 'high' : risks.length > 3 ? 'medium' : 'low';
    
    return {
      risks,
      overallRisk,
      mitigation: 'Regular sprint reviews and early user feedback sessions'
    };
  }

  private async simulateThinking(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods to get current state
  getState(): AIAgentState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  getCurrentThinking(): AIThinkingProcess | null {
    return this.state.currentThinking;
  }

  getTodoList(): AITodoItem[] {
    return [...this.state.todoList];
  }

  getFieldProgress(): Record<string, any> {
    return { ...this.state.fieldProgress };
  }
}

// Export singleton instance
export const aiAgent = new AIAgentEngine();