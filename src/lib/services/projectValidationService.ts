import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";

export interface ProjectInitiative {
  content: string;
  companyName?: string;
  timestamp: Date;
}

export interface ProjectPotentialResult {
  hasPotential: boolean;
  confidence: number;
  reasoning: string;
  missingElements: string[];
}

export interface ProjectQualificationResult {
  isProject: boolean;
  confidence: number;
  reasoning: string;
}

export interface ChecklistItem {
  task: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export interface ValidationResult {
  isValidProject: boolean;
  projectQualificationPotential: number;
  projectDefinitionReadiness: number;
  hasCompanyInfo: boolean;
  feedback: string;
  completionChecklist: ChecklistCategory[];
  nextSteps: string[];
  potentialResult?: ProjectPotentialResult;
  qualificationResult?: ProjectQualificationResult;
  projectCriteria?: {
    scope?: string;
    budget?: string;
    timeline?: string;
  };
}

export interface CompanyInfo {
  name: string;
  employees?: string;
  revenue?: string;
  country?: string;
  description?: string;
}

export interface ConversationState {
  messages: BaseMessage[];
  currentInitiative?: ProjectInitiative;
  validationAttempts: number;
  hasValidProject: boolean;
  companyName?: string;
  companyInfo?: CompanyInfo;
}

export interface DebugCallback {
  (type: 'ai_parse_failure' | 'ai_missing_score' | 'api_error_fallback', title: string, details: any): void;
}

export class ProjectValidationAgent {
  private llm: ChatOpenAI;
  private validationChain!: RunnableSequence;
  private conversationChain!: RunnableSequence;
  
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for project validation');
    }

    this.llm = new ChatOpenAI({
      modelName: "o3-mini",
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelKwargs: {
        reasoning_effort: "low", // Use low for better token efficiency like our working test
        max_completion_tokens: 6000 // Increased token limit for reasoning
      }
    });

    console.log(`🤖 Project Validation Agent using LangChain ChatOpenAI with o3-mini`);
    this.setupChains();
  }

  private setupChains() {
    // Project validation chain for completeness assessment
    const validationPrompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert project validation assistant. Your job is to assess if a project initiative has enough details to be considered complete.

A COMPLETE PROJECT must have:
1. CLEARLY DEFINED SCOPE: Specific goals, deliverables, and success criteria
2. CALCULABLE BUDGET: Either provided or reasonably estimable based on scope
3. FIXED TIMELINE: Clear start/end dates or duration

COMPANY INFORMATION REQUIREMENT:
- You must also check if the user has provided their company name
- If missing, you should request it

RESPONSE FORMAT - Always respond with valid JSON containing these exact fields:
- isValidProject: true or false
- projectQualificationPotential: IGNORE THIS FIELD (handled by Stage 1)
- projectDefinitionReadiness: number 0-100 (percentage of how complete the project definition is)
- hasCompanyInfo: true or false
- feedback: detailed explanation of your assessment
- completionChecklist: array of checklist categories with items
- nextSteps: array of actionable next steps
- projectCriteria: object with scope, budget, timeline assessments

For completionChecklist, create categories like "Project Scope", "Timeline & Planning", "Budget & Resources" with items having task, completed (true/false), and priority (high/medium/low).

GUIDANCE RULES:
- Instead of saying "Please rephrase...", ask specific questions about what's missing
- For missing scope: Ask "What specific features do you want to build?" or "What problem will this solve?"
- For missing budget: Ask "What's your estimated budget range?" or "How many team members will work on this?"
- For missing timeline: Ask "When do you need this completed?" or "How long do you think this will take?"
- For missing company info: Ask "What company is this project for?"
- Be specific and actionable in your suggestions.`],
      ["human", "Initiative: {initiative}\n\nCompany Name (if provided): {companyName}\n\nPlease validate this initiative."]
    ]);

    this.validationChain = RunnableSequence.from([
      validationPrompt,
      this.llm,
      new StringOutputParser()
    ]);

    // Conversational guidance chain
    const conversationPrompt = ChatPromptTemplate.fromMessages([
      ["system", `You are a helpful project consultant guiding users to structure their initiatives into valid projects.

Your role:
1. Help users refine their ideas into proper project format
2. Ask clarifying questions to extract missing project elements
3. Provide specific, actionable guidance
4. Be encouraging but maintain project standards

Project Requirements:
- Clearly defined scope (goals, deliverables, success criteria)
- Calculable budget (provided or estimable)
- Fixed timeline (start/end dates or duration)
- Company name for context

Keep responses conversational, helpful, and focused on moving toward a valid project structure.`],
      new MessagesPlaceholder("history"),
      ["human", "{input}"]
    ]);

    this.conversationChain = RunnableSequence.from([
      conversationPrompt,
      this.llm,
      new StringOutputParser()
    ]);
  }

  // STAGE 1: Project Potential Assessment
  async hasProjectPotential(input: string): Promise<ProjectPotentialResult> {
    try {
      const potentialPrompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert at identifying if a user's input has PROJECT POTENTIAL.

PROJECT POTENTIAL means the subject could reasonably be developed into a temporary business endeavor with unique deliverables through follow-up questions.

✅ HAS PROJECT POTENTIAL (even if incomplete):
- Business improvement ideas
- Product/service creation
- Process optimization
- System implementation
- Event planning with business context
- Any business initiative that could have scope, timeline, budget

❌ NO PROJECT POTENTIAL (will never be a project):
- General information queries
- Shopping/purchasing
- Personal activities without business context
- Theoretical questions
- Ongoing operational tasks

RESPONSE FORMAT - Respond with ONLY a JSON object with these exact fields:
- hasPotential: true or false
- confidence: number between 0.0 and 1.0
- reasoning: string explaining your assessment
- missingElements: array of strings for missing project elements

Focus on POTENTIAL, not completeness. If it could become a project with more details, mark as true.`],
        ["human", "Assess project potential: {input}"]
      ]);

      const potentialChain = RunnableSequence.from([
        potentialPrompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await potentialChain.invoke({ input });
      
      try {
      const result = JSON.parse(response);
      
      // Log for debugging
      console.log(`[DEBUG] Project potential for "${input}":`, result);
      
      return {
          hasPotential: result.hasPotential || false,
          confidence: result.confidence || 0.5,
          reasoning: result.reasoning || "Unable to assess project potential",
        missingElements: result.missingElements || []
      };
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        // Fallback logic based on keywords
        const hasProjectKeywords = this.hasProjectKeywords(input);
        return {
          hasPotential: hasProjectKeywords,
          confidence: hasProjectKeywords ? 0.6 : 0.3,
          reasoning: hasProjectKeywords 
            ? "Contains project-related keywords but needs analysis"
            : "Does not appear to contain project-related content",
          missingElements: hasProjectKeywords 
            ? ["scope", "timeline", "budget", "business context"]
            : []
        };
      }
      
    } catch (error) {
      console.error('Project potential assessment error:', error);
      
      // Fallback logic
      const basicProjectKeywords = ['project', 'build', 'create', 'develop', 'implement', 'launch', 'improve', 'system', 'app', 'process'];
      const nonProjectKeywords = ['weather', 'cheapest', 'what is', 'how to', 'recipe', 'movie'];
      
      const lowercaseInput = input.toLowerCase();
      const hasProjectKeywords = basicProjectKeywords.some(keyword => lowercaseInput.includes(keyword));
      const hasNonProjectKeywords = nonProjectKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      if (hasNonProjectKeywords) {
        return {
          hasPotential: false,
          confidence: 0.8,
          reasoning: "Appears to be a general query or non-business request",
          missingElements: []
        };
      }
      
      return {
        hasPotential: hasProjectKeywords,
        confidence: hasProjectKeywords ? 0.6 : 0.3,
        reasoning: hasProjectKeywords 
          ? "Contains project-related keywords but needs analysis"
          : "No clear project indicators detected",
        missingElements: hasProjectKeywords 
          ? ["scope", "timeline", "budget", "business context"]
          : []
      };
    }
  }

  private hasProjectKeywords(input: string): boolean {
    const projectKeywords = [
      'project', 'build', 'create', 'develop', 'implement', 'launch', 'design',
      'system', 'app', 'application', 'website', 'platform', 'tool', 'service',
      'improve', 'optimize', 'automate', 'streamline', 'upgrade', 'migrate',
      'business', 'company', 'organization', 'team', 'client', 'customer',
      'budget', 'cost', 'timeline', 'deadline', 'schedule', 'deliverable'
    ];
    
    const lowercaseInput = input.toLowerCase();
    return projectKeywords.some(keyword => lowercaseInput.includes(keyword));
  }

  // STAGE 2: Project Completeness Validation
  async validateProjectCompleteness(
    initiative: string, 
    companyName?: string,
    debugCallback?: DebugCallback
  ): Promise<ValidationResult> {
    try {
      const response = await this.validationChain.invoke({
        initiative,
        companyName: companyName || "Not provided"
      });

      // Parse the JSON response with error handling
      try {
      const result = JSON.parse(response);
      
      // Check if AI returned a score or used the default
      if (!result.projectQualificationPotential) {
        debugCallback?.('ai_missing_score', '🔍 AI Missing Score Fallback', {
          reason: 'OpenAI o3-mini response did not include projectQualificationPotential field',
          fallbackValue: 50,
          responseReceived: 'Valid JSON but missing score field',
          impact: 'Using default 50% qualification score',
          aiResponse: result
        });
      }
      
      return {
          isValidProject: result.isValidProject || false,
          projectQualificationPotential: result.projectQualificationPotential || 50,
          projectDefinitionReadiness: result.projectDefinitionReadiness || 30,
          hasCompanyInfo: result.hasCompanyInfo || false,
          feedback: result.feedback || "Project assessment completed",
          completionChecklist: result.completionChecklist || this.getDefaultChecklist(!!companyName),
          nextSteps: result.nextSteps || ["Define project scope", "Set timeline", "Estimate budget"],
          projectCriteria: result.projectCriteria || { scope: "Needs definition", budget: "Not specified", timeline: "Not specified" }
        };
      } catch (parseError) {
        console.error('Failed to parse validation response:', response);
        
        // Emit debug info about parsing failure
        debugCallback?.('ai_parse_failure', '⚠️ AI Response Parse Failure', {
          reason: 'OpenAI o3-mini returned invalid JSON that could not be parsed',
          error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          rawResponse: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
          fallbackAction: 'Using default validation result with 40% qualification score',
          impact: 'Basic project structure guidance provided instead of AI analysis'
        });
        
        // Return fallback validation result
        return this.getFallbackValidationResult(!!companyName);
      }
    } catch (error) {
      console.error('Project validation error:', error);
      
      // Emit debug info about API error
      debugCallback?.('api_error_fallback', '🚨 OpenAI API Error Fallback', {
        reason: 'Failed to communicate with OpenAI o3-mini model',
        error: error instanceof Error ? error.message : 'Unknown API error',
        fallbackAction: 'Using static validation result with 30% qualification score',
        impact: 'Generic project guidance provided, no AI analysis available',
        retryAdvice: 'This is usually temporary - try again in a few moments'
      });
      
      return {
        isValidProject: false,
        projectQualificationPotential: 30,
        projectDefinitionReadiness: 15,
        hasCompanyInfo: !!companyName,
        feedback: "I encountered an error while validating your initiative. Let me help you structure it properly.",
        completionChecklist: [
          {
            category: "Project Scope",
            items: [
              { task: "Define specific problem to solve", completed: false, priority: "high" },
              { task: "List key features and deliverables", completed: false, priority: "high" },
              { task: "Identify target users/beneficiaries", completed: false, priority: "medium" }
            ]
          },
          {
            category: "Timeline & Planning",
            items: [
              { task: "Set project start date", completed: false, priority: "high" },
              { task: "Define project milestones", completed: false, priority: "high" },
              { task: "Estimate completion timeline", completed: false, priority: "high" }
            ]
          },
          {
            category: "Budget & Resources",
            items: [
              { task: "Estimate total budget", completed: false, priority: "high" },
              { task: "Identify team size and skills needed", completed: false, priority: "high" },
              { task: "Plan resource allocation", completed: false, priority: "medium" }
            ]
          },
          {
            category: "Company Context",
            items: [
              { task: "Specify company/organization name", completed: !!companyName, priority: "medium" },
              { task: "Define business impact", completed: false, priority: "medium" }
            ]
          }
        ],
        nextSteps: [
          "Start by defining the specific problem you want to solve",
          "Outline the key deliverables and features",
          "Set a realistic timeline with milestones"
        ]
      };
    }
  }

  private getDefaultChecklist(hasCompanyInfo: boolean): ChecklistCategory[] {
    return [
      {
        category: "Project Scope",
        items: [
          { task: "Define specific problem to solve", completed: false, priority: "high" },
          { task: "List key features and deliverables", completed: false, priority: "high" },
          { task: "Identify target users/beneficiaries", completed: false, priority: "medium" }
        ]
      },
      {
        category: "Timeline & Planning",
        items: [
          { task: "Set project start date", completed: false, priority: "high" },
          { task: "Define project milestones", completed: false, priority: "high" },
          { task: "Estimate completion timeline", completed: false, priority: "high" }
        ]
      },
      {
        category: "Budget & Resources",
        items: [
          { task: "Estimate total budget", completed: false, priority: "high" },
          { task: "Identify team size and skills needed", completed: false, priority: "high" },
          { task: "Plan resource allocation", completed: false, priority: "medium" }
        ]
      },
      {
        category: "Company Context",
        items: [
          { task: "Specify company/organization name", completed: hasCompanyInfo, priority: "medium" },
          { task: "Define business impact", completed: false, priority: "medium" }
        ]
      }
    ];
  }

  private getFallbackValidationResult(hasCompanyInfo: boolean): ValidationResult {
    return {
      isValidProject: false,
      projectQualificationPotential: 40,
      projectDefinitionReadiness: 20,
      hasCompanyInfo,
      feedback: "I'm having trouble processing your request, but I can help you structure your project properly.",
      completionChecklist: this.getDefaultChecklist(hasCompanyInfo),
      nextSteps: [
        "Start by defining the specific problem you want to solve",
        "Outline the key deliverables and features", 
        "Set a realistic timeline with milestones"
      ],
      projectCriteria: {
        scope: "Needs definition",
        budget: "Not specified", 
        timeline: "Not specified"
      }
    };
  }

  // Updated main validation method with two-stage approach
  async validateInitiative(
    initiative: string, 
    companyName?: string,
    debugCallback?: DebugCallback
  ): Promise<ValidationResult> {
    try {
      // STAGE 1: Check project potential
      const potentialResult = await this.hasProjectPotential(initiative);
      
      if (!potentialResult.hasPotential) {
        return {
          isValidProject: false,
          projectQualificationPotential: 0, // Stage 1: No project potential = 0%
          projectDefinitionReadiness: 10,
          hasCompanyInfo: !!companyName,
          feedback: `This doesn't appear to be a project initiative. ${potentialResult.reasoning}`,
          completionChecklist: [
            {
              category: "Project Identification",
              items: [
                { task: "Identify a business challenge to address", completed: false, priority: "high" },
                { task: "Define a unique product, service, or process improvement", completed: false, priority: "high" },
                { task: "Specify desired business outcome", completed: false, priority: "high" }
              ]
            }
          ],
          nextSteps: [
            "Think about a business problem that needs solving",
            "Consider what unique value you want to create",
            "Frame your request in terms of business deliverables"
          ],
          potentialResult,
          projectCriteria: {
            scope: "Not identified as project",
            budget: "Not applicable",
            timeline: "Not applicable"
          }
        };
      }

      // STAGE 2: If it has potential, assess completeness
      const validation = await this.validateProjectCompleteness(initiative, companyName, debugCallback);
      
      // Add potential result to validation
      validation.potentialResult = potentialResult;
      
      // Fix Stage 1 score: If it has project potential, qualification should be 100%
      validation.projectQualificationPotential = 100;
      
      if (validation.isValidProject && validation.hasCompanyInfo) {
        validation.feedback = `Great! This has strong project potential and good details. ${validation.feedback}`;
      } else if (validation.isValidProject) {
        validation.feedback = `This has excellent project potential! ${validation.feedback}`;
      } else {
        validation.feedback = `Good news - this definitely has project potential! ${potentialResult.reasoning} Now let's add the missing details. ${validation.feedback}`;
      }
      
      return validation;
      
    } catch (error) {
      console.error('Project validation error:', error);
      return {
        isValidProject: false,
        projectQualificationPotential: 30,
        projectDefinitionReadiness: 15,
        hasCompanyInfo: !!companyName,
        feedback: "I encountered an error while validating your initiative. Let me help you structure it properly.",
        completionChecklist: [
          {
            category: "Project Scope",
            items: [
              { task: "Define specific problem to solve", completed: false, priority: "high" },
              { task: "List key features and deliverables", completed: false, priority: "high" },
              { task: "Identify target users/beneficiaries", completed: false, priority: "medium" }
            ]
          },
          {
            category: "Timeline & Planning",
            items: [
              { task: "Set project start date", completed: false, priority: "high" },
              { task: "Define project milestones", completed: false, priority: "high" },
              { task: "Estimate completion timeline", completed: false, priority: "high" }
            ]
          },
          {
            category: "Budget & Resources",
            items: [
              { task: "Estimate total budget", completed: false, priority: "high" },
              { task: "Identify team size and skills needed", completed: false, priority: "high" },
              { task: "Plan resource allocation", completed: false, priority: "medium" }
            ]
          },
          {
            category: "Company Context",
            items: [
              { task: "Specify company/organization name", completed: !!companyName, priority: "medium" },
              { task: "Define business impact", completed: false, priority: "medium" }
            ]
          }
        ],
        nextSteps: [
          "Start by defining the specific problem you want to solve",
          "Outline the key deliverables and features",
          "Set a realistic timeline with milestones"
        ]
      };
    }
  }

  async continueConversation(
    input: string,
    conversationHistory: BaseMessage[]
  ): Promise<string> {
    try {
      const response = await this.conversationChain.invoke({
        input,
        history: conversationHistory
      });

      return response;
    } catch (error) {
      console.error('Conversation error:', error);
      return "I'm having trouble processing your message. Could you help me understand by answering these questions:\n\n• What specific outcome do you want to achieve?\n• What's your timeline for this project?\n• What's your estimated budget or team size?\n\nThis will help me provide better guidance for your project.";
    }
  }

  async enrichCompanyInfo(companyName: string): Promise<CompanyInfo> {
    // For now, return basic company info without web search
    // TODO: Implement proper web search with absolute URLs in server context
    return {
      name: companyName,
      description: `Project context for ${companyName}`,
      employees: 'Not specified',
      revenue: 'Not specified',
      country: 'Not specified'
    };
  }

  private extractCompanyInfoFromSearch(companyName: string, searchResults: any[]): CompanyInfo {
    const companyInfo: CompanyInfo = { name: companyName };
    
    if (!searchResults || searchResults.length === 0) {
      return companyInfo;
    }

    // Combine all search result text for analysis
    const allText = searchResults.map(result => 
      `${result.title || ''} ${result.snippet || ''} ${result.content || ''}`
    ).join(' ').toLowerCase();

    // Extract employee count
    const employeePatterns = [
      /(\d{1,3}(?:,\d{3})*)\s*(?:employees?|staff|workers?|people)/gi,
      /employ(?:s|ing)\s*(?:over\s*)?(\d{1,3}(?:,\d{3})*)/gi,
      /workforce\s*of\s*(\d{1,3}(?:,\d{3})*)/gi
    ];

    for (const pattern of employeePatterns) {
      const match = allText.match(pattern);
      if (match) {
        companyInfo.employees = match[0];
        break;
      }
    }

    // Extract revenue
    const revenuePatterns = [
      /revenue\s*of\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m))/gi,
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m))\s*(?:in\s*)?revenue/gi,
      /annual\s*sales?\s*of\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m))/gi
    ];

    for (const pattern of revenuePatterns) {
      const match = allText.match(pattern);
      if (match) {
        companyInfo.revenue = match[0];
        break;
      }
    }

    // Extract country/location
    const countryPatterns = [
      /(?:headquarter(?:ed|s)?|based|located)\s*in\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:headquarters|hq)/gi
    ];

    for (const pattern of countryPatterns) {
      const match = allText.match(pattern);
      if (match) {
        companyInfo.country = match[1];
        break;
      }
    }

    return companyInfo;
  }

  private getQuickValidationResult(input: string, hasCompanyInfo: boolean): ValidationResult {
    const hasProjectKeywords = this.hasProjectKeywords(input);
    const qualificationPotential = hasProjectKeywords ? 60 : 30;
    const definitionReadiness = hasProjectKeywords ? 25 : 15;
    
    return {
      isValidProject: false,
      projectQualificationPotential: qualificationPotential,
      projectDefinitionReadiness: definitionReadiness,
      hasCompanyInfo,
      feedback: hasProjectKeywords 
        ? "I can see this has project potential! Let me help you structure it properly using the checklist below."
        : "I'm here to help you develop your project idea. Let's work through the checklist to get started.",
      completionChecklist: this.getDefaultChecklist(hasCompanyInfo),
      nextSteps: [
        "Start with the high-priority items in the checklist",
        "Provide more details about your specific goals",
        "Let me know if you need help with any particular area"
      ],
      projectCriteria: {
        scope: hasProjectKeywords ? "Partially defined" : "Needs definition",
        budget: "Not specified",
        timeline: "Not specified"
      }
    };
  }

  async processUserInput(
    input: string,
    state: ConversationState,
    useQuickMode = false,
    debugCallback?: DebugCallback
  ): Promise<{
    response: string;
    validation?: ValidationResult;
    updatedState: ConversationState;
  }> {
    // Add user message to history
    const updatedMessages = [...state.messages, new HumanMessage(input)];
    
    // Extract company name if mentioned in input
    const extractedCompanyName = this.extractCompanyName(input, state);
    const currentCompanyName = extractedCompanyName || state.companyName;
    
    // Enrich company information if we have a company name but no detailed info
    let companyInfo = state.companyInfo;
    if (currentCompanyName && !companyInfo) {
      companyInfo = await this.enrichCompanyInfo(currentCompanyName);
    }

    // Quick mode fallback - skip AI processing if requested
    if (useQuickMode) {
      const quickValidation = this.getQuickValidationResult(input, !!currentCompanyName);
      const response = `I'm processing your request: "${input}". ${quickValidation.feedback}`;
      
      return {
        response,
        validation: quickValidation,
        updatedState: {
          ...state,
          messages: [...updatedMessages, new AIMessage(response)],
          validationAttempts: state.validationAttempts + 1,
          hasValidProject: quickValidation.isValidProject,
          companyName: currentCompanyName,
          companyInfo: companyInfo
        }
      };
    }

    // Check if this looks like a new project initiative using potential assessment
    const potentialResult = await this.hasProjectPotential(input);
    const isNewInitiative = potentialResult.hasPotential && potentialResult.confidence > 0.5;
    
    if (isNewInitiative || !state.hasValidProject) {
      // Use the new two-stage validation
      const validation = await this.validateInitiative(input, currentCompanyName, debugCallback);
      
      let response: string;
      
      if (!validation.potentialResult?.hasPotential) {
        response = `${validation.feedback}\n\nProjects involve creating unique business deliverables with defined scope, timeline, and budget. What business initiative would you like to work on?`;
      } else if (validation.isValidProject && validation.hasCompanyInfo) {
        response = `Excellent! I've validated your project initiative. ${validation.feedback}\n\nNext steps:\n${validation.nextSteps.map(step => `• ${step}`).join('\n')}`;
      } else if (validation.isValidProject && !validation.hasCompanyInfo) {
        response = `Great project potential! ${validation.feedback}\n\nTo provide more targeted guidance, could you please share your company name?`;
      } else {
        // Generate a summary of the checklist for the response
        const checklistSummary = validation.completionChecklist
          .flatMap(category => category.items.filter(item => !item.completed))
          .slice(0, 3) // Show top 3 incomplete items
          .map(item => `• ${item.task}`)
          .join('\n');
        
        response = `${validation.feedback}\n\nNext steps to complete your project definition:\n${checklistSummary}\n\nWhich of these would you like to start with?`;
      }

      const aiMessage = new AIMessage(response);
      
      return {
        response,
        validation,
        updatedState: {
          messages: [...updatedMessages, aiMessage],
          currentInitiative: { content: input, companyName: currentCompanyName, timestamp: new Date() },
          validationAttempts: state.validationAttempts + 1,
          hasValidProject: validation.isValidProject && validation.hasCompanyInfo,
          companyName: currentCompanyName,
          companyInfo: companyInfo
        }
      };
    } else {
      // Continue conversation to refine the project
      const response = await this.continueConversation(input, updatedMessages);
      const aiMessage = new AIMessage(response);
      
      return {
        response,
        updatedState: {
          ...state,
          messages: [...updatedMessages, aiMessage]
        }
      };
    }
  }

  private extractCompanyName(input: string, state: ConversationState): string | undefined {
    // Pattern 1: Explicit company mentions
    const explicitMatch = input.match(/(?:company|organization|business)(?:\s+is\s+|\s+name\s+is\s+|\s*:\s*)([A-Za-z0-9\s&.,'-]+)/i);
    if (explicitMatch) {
      return explicitMatch[1].trim();
    }

    // Pattern 2: "I work at/for [Company]" or "at [Company]"
    const workAtMatch = input.match(/(?:work\s+(?:at|for)|at)\s+([A-Z][A-Za-z0-9\s&.,'-]{1,50})/i);
    if (workAtMatch) {
      return workAtMatch[1].trim();
    }

    // Pattern 3: Look for known company names or capitalized words that could be company names
    if (!state.companyName) {
      // Known company names (case-insensitive)
      const knownCompanies = ['diageo', 'microsoft', 'google', 'apple', 'amazon', 'meta', 'netflix', 'uber', 'airbnb'];
      const lowerInput = input.toLowerCase();
      
      for (const company of knownCompanies) {
        if (lowerInput.includes(company)) {
          return company.charAt(0).toUpperCase() + company.slice(1);
        }
      }
      
      // Look for capitalized words (potential company names)
      const capitalizedWords = input.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      if (capitalizedWords) {
        // Filter out common words that aren't company names
        const commonWords = ['I', 'My', 'The', 'This', 'That', 'We', 'Our', 'Team', 'Commercial', 'Finance', 'Chatbot', 'Build', 'Want', 'Need', 'Please'];
        const potentialCompanies = capitalizedWords.filter(word => 
          !commonWords.includes(word) && 
          word.length > 2 && 
          !word.toLowerCase().includes('chatbot') &&
          !word.toLowerCase().includes('team') &&
          !word.toLowerCase().includes('finance')
        );
        
        // Return the first potential company name
        if (potentialCompanies.length > 0) {
          return potentialCompanies[0];
        }
      }
    }

    return undefined;
  }

  createInitialState(): ConversationState {
    return {
      messages: [
        new SystemMessage("I'm here to help you validate and structure your project initiatives. Please share your project idea, and I'll help you develop it into a proper project format.")
      ],
      validationAttempts: 0,
      hasValidProject: false
    };
  }

  async getWelcomeMessage(): Promise<string> {
    return `Hello! I'm your AI Project Validation Assistant. 

I can help you:
• Assess if your idea has project potential
• Guide you through developing incomplete ideas into full projects
• Validate complete project proposals
• Capture company information for better context

Please share your business initiative or idea, and I'll help you structure it into a proper project.

**What makes a valid project:**
✅ Clearly defined scope (goals, deliverables, success criteria)
✅ Calculable budget (provided or estimable)  
✅ Fixed timeline (start/end dates or duration)
✅ Company context for tailored guidance

What business initiative would you like to work on?`;
  }
}

// Export singleton instance
export const projectValidationAgent = new ProjectValidationAgent();
