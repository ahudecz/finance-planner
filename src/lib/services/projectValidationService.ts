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
  productVisionCriteria?: {
    vision?: string;
    targetGroup?: string;
    needs?: string;
    product?: string;
    businessGoals?: string;
  };
}

export interface CompanyInfo {
  name: string;
  employees?: string; // Number of employees
  nsv?: string; // Net Sales Value from last year
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
  (type: 'ai_parse_failure' | 'ai_missing_score' | 'api_error_fallback' | 'ai_field_calculation', title: string, details: any): void;
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
      timeout: 150000, // 150 seconds timeout to match our fallback logic
      configuration: {
        timeout: 150000, // Also set at configuration level
      },
      modelKwargs: {
        reasoning_effort: "low", // Use low for better token efficiency
        max_completion_tokens: 6000 // Increased token limit for reasoning
      }
    });

    console.log(`🤖 Project Validation Agent using LangChain ChatOpenAI with o3-mini`);
    console.log(`🔑 OpenAI API Key present: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
    console.log(`🔑 API Key length: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0} characters`);
    this.setupChains();
  }

  private setupChains() {
    // Project validation chain for completeness assessment
    const validationPrompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert product validation assistant. Your job is to assess if a product initiative has enough details across the five building blocks of product vision.

A COMPLETE PRODUCT VISION must have clear elements for:
1. VISION: Purpose for creating the product, positive change it should bring
2. TARGET GROUP: Market segment, target customers/users identified
3. NEEDS: Problem the product solves, benefits it provides
4. PRODUCT: What the product is, what makes it stand out, feasibility considerations
5. BUSINESS GOALS: How it benefits the company, business objectives

COMPANY INFORMATION REQUIREMENT:
- You must also check if the user has provided their company name
- If missing, you should request it

RESPONSE FORMAT - Always respond with valid JSON containing these exact fields:
- isValidProject: true or false
- projectDefinitionReadiness: number 0-100 (percentage of how complete the product vision is)
- hasCompanyInfo: true or false
- feedback: detailed explanation of your assessment
- completionChecklist: array of checklist categories with items
- nextSteps: array of actionable next steps
- productVisionCriteria: object with vision, targetGroup, needs, product, businessGoals assessments

DO NOT include projectQualificationPotential field in your response - this is handled separately.

For completionChecklist, create categories like "Product Vision", "Target Market", "Problem & Solution", "Business Value" with items having task, completed (true/false), and priority (high/medium/low).

GUIDANCE RULES:
- Instead of saying "Please rephrase...", ask specific questions about what's missing
- For missing vision: Ask "What positive change do you want this product to bring?" or "What's your purpose for creating this?"
- For missing target group: Ask "Who are your target customers?" or "What market segment will you serve?"
- For missing needs: Ask "What specific problem does this solve?" or "What benefits will users get?"
- For missing product: Ask "What exactly is the product?" or "What makes your solution unique?"
- For missing business goals: Ask "How will this benefit your company?" or "What are your business objectives?"
- For missing company info: Ask "What company is this product for?"
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
    const startTime = Date.now();
    console.log(`🔍 Starting hasProjectPotential at ${new Date().toISOString()} for input: "${input.substring(0, 100)}..."`);
    try {
      const potentialPrompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert at identifying if a user's input contains the FIVE BUILDING BLOCKS OF PRODUCT VISION.

A user prompt has PROJECT POTENTIAL if it contains or implies elements from the Product Vision Board's five building blocks:

1. VISION - Purpose for creating the product, positive change it should bring
2. TARGET GROUP - Market segment, target customers/users  
3. NEEDS - Problem the product solves, benefits it provides
4. PRODUCT - What the product is, what makes it stand out, feasibility
5. BUSINESS GOALS - How it benefits the company, business objectives

✅ HAS PROJECT POTENTIAL (contains 2+ building blocks, even if incomplete):
- Ideas mentioning target users and problems to solve
- Product concepts with business benefits
- Solutions addressing specific market needs
- Initiatives with clear vision and feasibility considerations
- Any combination of vision elements that could be expanded

❌ NO PROJECT POTENTIAL (lacks product vision elements):
- General information queries
- Shopping/purchasing requests  
- Personal activities without business context
- Theoretical questions without product focus
- Operational tasks without product development

RESPONSE FORMAT - Respond with ONLY a JSON object with these exact fields:
- hasPotential: true or false
- confidence: number between 0.0 and 1.0
- reasoning: string explaining your assessment based on which building blocks are present/missing
- missingElements: array of strings for missing building blocks (use: "vision", "target_group", "needs", "product", "business_goals")

Focus on PRODUCT VISION POTENTIAL, not project completeness. If it contains building blocks that could be expanded, mark as true.`],
        ["human", "Assess project potential: {input}"]
      ]);

      const potentialChain = RunnableSequence.from([
        potentialPrompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await potentialChain.invoke({ input });
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ hasProjectPotential completed in ${duration}ms (${(duration/1000).toFixed(2)}s) at ${new Date().toISOString()}`);
      
      try {
      const result = JSON.parse(response);
      
      // Log for debugging
      console.log(`[DEBUG] Product vision building blocks assessment for "${input}":`, result);
      
      return {
          hasPotential: result.hasPotential || false,
          confidence: result.confidence || 0.5,
          reasoning: result.reasoning || "Unable to assess product vision building blocks",
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
            ? "Contains product-related keywords but needs analysis of vision building blocks"
            : "Does not appear to contain product vision elements",
          missingElements: hasProjectKeywords 
            ? ["vision", "target_group", "needs", "product", "business_goals"]
            : []
        };
      }
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`❌ Project potential assessment error after ${duration}ms (${(duration/1000).toFixed(2)}s):`, error);
      console.error('Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        cause: error instanceof Error && 'cause' in error ? error.cause : 'No cause'
      });
      
      // Fallback logic
      const basicProductKeywords = ['product', 'build', 'create', 'develop', 'solution', 'users', 'customers', 'problem', 'business', 'service'];
      const nonProductKeywords = ['weather', 'cheapest', 'what is', 'how to', 'recipe', 'movie'];
      
      const lowercaseInput = input.toLowerCase();
      const hasProductKeywords = basicProductKeywords.some(keyword => lowercaseInput.includes(keyword));
      const hasNonProductKeywords = nonProductKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      if (hasNonProductKeywords) {
        return {
          hasPotential: false,
          confidence: 0.8,
          reasoning: "Appears to be a general query or non-product request",
          missingElements: []
        };
      }
      
      return {
        hasPotential: hasProductKeywords,
        confidence: hasProductKeywords ? 0.6 : 0.3,
        reasoning: hasProductKeywords 
          ? "Contains product-related keywords but needs analysis of vision building blocks"
          : "No clear product vision indicators detected",
        missingElements: hasProductKeywords 
          ? ["vision", "target_group", "needs", "product", "business_goals"]
          : []
      };
    }
  }

  private hasProjectKeywords(input: string): boolean {
    const productVisionKeywords = [
      // Vision keywords
      'vision', 'purpose', 'mission', 'goal', 'change', 'impact', 'transform',
      // Target group keywords  
      'users', 'customers', 'market', 'segment', 'audience', 'target', 'clients',
      // Needs keywords
      'problem', 'solve', 'need', 'benefit', 'pain', 'challenge', 'issue', 'help',
      // Product keywords
      'product', 'service', 'platform', 'app', 'application', 'tool', 'solution', 'build', 'create', 'develop',
      // Business goals keywords
      'business', 'revenue', 'profit', 'growth', 'company', 'organization', 'value', 'roi'
    ];
    
    const lowercaseInput = input.toLowerCase();
    return productVisionKeywords.some(keyword => lowercaseInput.includes(keyword));
  }

  // STAGE 2: Project Completeness Validation
  async validateProjectCompleteness(
    initiative: string, 
    companyName?: string,
    debugCallback?: DebugCallback
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    console.log(`🔍 Starting validateProjectCompleteness at ${new Date().toISOString()} for initiative: "${initiative.substring(0, 100)}..."`);
    try {
      // Create explicit timeout for the chain invocation to handle LangChain internal timeouts
      const chainPromise = this.validationChain.invoke({
        initiative,
        companyName: companyName || "Not provided"
      });
      
      const chainTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log(`⏰ Chain invocation timeout after 145 seconds at ${new Date().toISOString()}`);
          reject(new Error('LangChain validation chain timeout after 145 seconds'));
        }, 145000); // 5 seconds less than main timeout to allow proper error handling
      });
      
      const response = await Promise.race([chainPromise, chainTimeoutPromise]);

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ validateProjectCompleteness AI call completed in ${duration}ms (${(duration/1000).toFixed(2)}s) at ${new Date().toISOString()}`);

      // Parse the JSON response with error handling
      try {
      const result = JSON.parse(response);
      
      // Calculate projectQualificationPotential based on projectDefinitionReadiness
      // Since we explicitly told the AI not to include this field, we calculate it ourselves
      const readinessScore = result.projectDefinitionReadiness || 30;
      const calculatedQualification = Math.min(100, Math.max(0, readinessScore + 20)); // Add 20 points to readiness for qualification
      
      debugCallback?.('ai_field_calculation', '📊 Qualification Score Calculated', {
        method: 'Derived from projectDefinitionReadiness',
        readinessScore: readinessScore,
        calculatedQualification: calculatedQualification,
        reasoning: 'projectQualificationPotential = projectDefinitionReadiness + 20 (capped at 100)',
        impact: 'Consistent scoring based on project completeness'
      });
      
      return {
          isValidProject: result.isValidProject || false,
          projectQualificationPotential: calculatedQualification,
          projectDefinitionReadiness: readinessScore,
          hasCompanyInfo: result.hasCompanyInfo || false,
          feedback: result.feedback || "Project assessment completed",
          completionChecklist: result.completionChecklist || this.getDefaultChecklist(!!companyName),
          nextSteps: result.nextSteps || ["Define project scope", "Set timeline", "Estimate budget"],
          productVisionCriteria: result.productVisionCriteria || { vision: "Needs definition", targetGroup: "Not identified", needs: "Not specified", product: "Not defined", businessGoals: "Not specified" }
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
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`❌ Project validation error after ${duration}ms (${(duration/1000).toFixed(2)}s):`, error);
      console.error('Full validation error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        cause: error instanceof Error && 'cause' in error ? error.cause : 'No cause'
      });
      
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
        category: "Product Vision",
        items: [
          { task: "Define the purpose for creating this product", completed: false, priority: "high" },
          { task: "Articulate the positive change it should bring", completed: false, priority: "high" },
          { task: "Clarify the overall vision and mission", completed: false, priority: "medium" }
        ]
      },
      {
        category: "Target Market",
        items: [
          { task: "Identify target market segment", completed: false, priority: "high" },
          { task: "Define target customers and users", completed: false, priority: "high" },
          { task: "Understand market demographics and characteristics", completed: false, priority: "medium" }
        ]
      },
      {
        category: "Problem & Solution",
        items: [
          { task: "Define the specific problem the product solves", completed: false, priority: "high" },
          { task: "Identify benefits users will gain", completed: false, priority: "high" },
          { task: "Validate user needs and pain points", completed: false, priority: "medium" }
        ]
      },
      {
        category: "Product Definition",
        items: [
          { task: "Define what the product is and its core features", completed: false, priority: "high" },
          { task: "Identify what makes it unique and stand out", completed: false, priority: "medium" },
          { task: "Assess feasibility and development considerations", completed: false, priority: "medium" }
        ]
      },
      {
        category: "Business Value",
        items: [
          { task: "Define how the product benefits the company", completed: false, priority: "high" },
          { task: "Set clear business objectives and goals", completed: false, priority: "high" },
          { task: "Specify company/organization context", completed: hasCompanyInfo, priority: "medium" }
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
      productVisionCriteria: {
        vision: "Needs definition",
        targetGroup: "Not identified", 
        needs: "Not specified",
        product: "Not defined",
        businessGoals: "Not specified"
      }
    };
  }

  // Optimized validation method that reuses potential result to avoid duplicate calls
  async validateInitiativeWithPotential(
    initiative: string, 
    companyName: string | undefined,
    potentialResult: any,
    debugCallback?: DebugCallback
  ): Promise<ValidationResult> {
    try {
      // STAGE 1: Use the already-computed potential result
      
      if (!potentialResult.hasPotential) {
        return {
          isValidProject: false,
          projectQualificationPotential: 0, // Stage 1: No project potential = 0%
          projectDefinitionReadiness: 10,
          hasCompanyInfo: !!companyName,
          feedback: `This doesn't appear to be a project initiative. ${potentialResult.reasoning}`,
          completionChecklist: [
            {
            category: "Product Vision Foundation",
              items: [
              { task: "Identify a business challenge or opportunity to address", completed: false, priority: "high" },
              { task: "Define a unique product or service concept", completed: false, priority: "high" },
              { task: "Articulate the desired business outcome and vision", completed: false, priority: "high" }
              ]
            }
          ],
          nextSteps: [
            "Think about a business problem that needs solving",
            "Consider what unique value you want to create",
            "Frame your request in terms of business deliverables"
          ],
          potentialResult,
          productVisionCriteria: {
            vision: "Not identified as product",
            targetGroup: "Not applicable",
            needs: "Not applicable",
            product: "Not applicable",
            businessGoals: "Not applicable"
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

  // Original validation method for backward compatibility
  async validateInitiative(
    initiative: string, 
    companyName?: string,
    debugCallback?: DebugCallback
  ): Promise<ValidationResult> {
    // Get potential result and delegate to optimized method
    const potentialResult = await this.hasProjectPotential(initiative);
    return this.validateInitiativeWithPotential(initiative, companyName, potentialResult, debugCallback);
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

  async enrichCompanyInfo(companyName: string, searchResultsProvider?: (query: string) => Promise<any[]>): Promise<CompanyInfo> {
    try {
      console.log(`🔍 Enriching company info for: ${companyName}`);
      
      if (!searchResultsProvider) {
        // Fallback to basic info if no search provider
    return {
      name: companyName,
          description: 'Web search not available in this context',
          employees: 'Not available',
          nsv: 'Not available',
      country: 'Not specified'
    };
      }
      
      // Search queries focusing on employees and NSV
      const searchQueries = [
        `${companyName} number of employees 2024 2023`,
        `${companyName} net sales revenue annual report 2023 2024`,
        `${companyName} company size workforce headcount`
      ];
      
      const companyInfo: CompanyInfo = { name: companyName };
      
      // Perform multiple searches to gather comprehensive information
      for (const query of searchQueries) {
        try {
          console.log(`🔍 Searching for: ${query}`);
          const searchResults = await searchResultsProvider(query);
          if (searchResults && searchResults.length > 0) {
            const extractedInfo = this.extractCompanyInfoFromSearch(companyName, searchResults);
            
            // Merge results, keeping the first non-empty values found
            if (!companyInfo.employees && extractedInfo.employees) {
              companyInfo.employees = extractedInfo.employees;
            }
            if (!companyInfo.nsv && extractedInfo.nsv) {
              companyInfo.nsv = extractedInfo.nsv;
            }
            if (!companyInfo.country && extractedInfo.country) {
              companyInfo.country = extractedInfo.country;
            }
            if (!companyInfo.description && extractedInfo.description) {
              companyInfo.description = extractedInfo.description;
            }
          }
        } catch (searchError) {
          console.warn(`Search failed for query: ${query}`, searchError);
          continue;
        }
      }
      
      console.log(`✅ Company info enriched for ${companyName}:`, companyInfo);
      return companyInfo;
      
    } catch (error) {
      console.error('Company enrichment error:', error);
      
      // Fallback to basic info
      return {
        name: companyName,
        description: 'Company information not available via web search',
        employees: 'Not found',
        nsv: 'Not found',
        country: 'Not specified'
      };
    }
  }

  private async performWebSearch(query: string): Promise<any[]> {
    try {
      // Note: This method will be called from the API route context
      // The actual web search will be performed by the API route using web_search tool
      console.log(`🔍 Performing web search for: ${query}`);
      
      // This is a placeholder - the actual implementation will be handled
      // by the API route that calls this service
      return [];
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  private extractCompanyInfoFromSearch(companyName: string, searchResults: any[]): CompanyInfo {
    const companyInfo: CompanyInfo = { name: companyName };
    
    if (!searchResults || searchResults.length === 0) {
      return companyInfo;
    }

    // Combine all search result text for analysis
    const allText = searchResults.map(result => 
      `${result.title || ''} ${result.snippet || ''} ${result.content || ''}`
    ).join(' ');

    // Extract employee count with more comprehensive patterns
    const employeePatterns = [
      // Standard patterns
      /(\d{1,3}(?:,\d{3})*)\s*(?:employees?|staff|workers?|people|associates)/gi,
      /employ(?:s|ing)\s*(?:over\s*|approximately\s*|around\s*)?(\d{1,3}(?:,\d{3})*)/gi,
      /workforce\s*of\s*(?:over\s*|approximately\s*)?(\d{1,3}(?:,\d{3})*)/gi,
      /headcount\s*(?:of\s*|is\s*)?(\d{1,3}(?:,\d{3})*)/gi,
      // With K notation
      /(\d{1,3}(?:\.\d+)?)\s*k\s*(?:employees?|staff|workers?|people)/gi,
      // Range patterns
      /(?:between\s*)?(\d{1,3}(?:,\d{3})*)\s*(?:to\s*|-)?\s*(?:\d{1,3}(?:,\d{3})*\s*)?(?:employees?|staff|workers?)/gi
    ];

    for (const pattern of employeePatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        // Take the first match and clean it up
        const match = matches[0];
        companyInfo.employees = match.replace(/\s+/g, ' ').trim();
        break;
      }
    }

    // Extract NSV (Net Sales Value) and revenue patterns
    const nsvPatterns = [
      // Net sales specific
      /net\s*sales?\s*(?:value\s*)?(?:of\s*|was\s*|:)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m|bn))/gi,
      /nsv\s*(?:of\s*|was\s*|:)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m|bn))/gi,
      // Revenue patterns (as fallback for NSV)
      /revenue\s*(?:of\s*|was\s*|reached\s*|:)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m|bn))/gi,
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m|bn))\s*(?:in\s*)?(?:net\s*)?(?:sales?|revenue)/gi,
      /annual\s*(?:net\s*)?(?:sales?|revenue)\s*(?:of\s*|was\s*|:)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m|bn))/gi,
      // Fiscal year patterns
      /(?:fy|fiscal\s*year)\s*\d{4}\s*(?:net\s*)?(?:sales?|revenue)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m|bn))/gi,
      // 2023/2024 specific patterns
      /(?:2023|2024)\s*(?:net\s*)?(?:sales?|revenue)\s*(?:of\s*|was\s*|:)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:billion|million|b|m|bn))/gi
    ];

    for (const pattern of nsvPatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        // Take the first match and clean it up
        const match = matches[0];
        companyInfo.nsv = match.replace(/\s+/g, ' ').trim();
        break;
      }
    }

    // Extract country/location
    const countryPatterns = [
      /(?:headquarter(?:ed|s)?|based|located)\s*in\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:headquarters|hq)/gi
    ];

    for (const pattern of countryPatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        companyInfo.country = matches[0].replace(/headquarter(?:ed|s)?|based|located|in|headquarters|hq/gi, '').trim();
        break;
      }
    }

    // Set description based on what we found
    const foundItems = [];
    if (companyInfo.employees) foundItems.push('employee count');
    if (companyInfo.nsv) foundItems.push('net sales value');
    if (companyInfo.country) foundItems.push('location');
    
    companyInfo.description = foundItems.length > 0 
      ? `Company information found: ${foundItems.join(', ')}`
      : 'Limited company information available';

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
      productVisionCriteria: {
        vision: hasProjectKeywords ? "Partially defined" : "Needs definition",
        targetGroup: "Not identified",
        needs: hasProjectKeywords ? "Partially defined" : "Not specified",
        product: hasProjectKeywords ? "Partially defined" : "Not defined",
        businessGoals: "Not specified"
      }
    };
  }

  async processUserInput(
    input: string,
    state: ConversationState,
    useQuickMode = false,
    debugCallback?: DebugCallback,
    searchProvider?: (query: string) => Promise<any[]>
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
      companyInfo = await this.enrichCompanyInfo(currentCompanyName, searchProvider);
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
      // Use the new two-stage validation (reuse the potentialResult we already have)
      const validation = await this.validateInitiativeWithPotential(input, currentCompanyName, potentialResult, debugCallback);
      
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
          .flatMap(category => (category.items || []).filter(item => !item.completed))
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
