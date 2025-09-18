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

export interface ProjectQualificationResult {
  isProject: boolean;
  confidence: number;
  reasoning: string;
}

export interface ValidationResult {
  isValidProject: boolean;
  confidence: number;
  hasCompanyInfo: boolean;
  feedback: string;
  suggestions: string[];
  nextSteps: string[];
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
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.setupChains();
  }

  private setupChains() {
    // Project validation chain
    const validationPrompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert project validation assistant. Your job is to determine if a user's initiative qualifies as a valid project and provide specific, actionable guidance.

A VALID PROJECT must have:
1. CLEARLY DEFINED SCOPE: Specific goals, deliverables, and success criteria
2. CALCULABLE BUDGET: Either provided or reasonably estimable based on scope
3. FIXED TIMELINE: Clear start/end dates or duration

COMPANY INFORMATION REQUIREMENT:
- You must also check if the user has provided their company name
- If missing, you should request it

RESPONSE FORMAT - Always respond with valid JSON:
{{
  "isValidProject": boolean,
  "confidence": number (0-1),
  "hasCompanyInfo": boolean,
  "feedback": "detailed explanation of your assessment",
  "suggestions": ["specific guided questions or requests for missing information"],
  "nextSteps": ["actionable next steps for the user"],
  "projectCriteria": {{
    "scope": "assessment of scope clarity",
    "budget": "assessment of budget information", 
    "timeline": "assessment of timeline information"
  }}
}}

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

  async validateInitiative(
    initiative: string, 
    companyName?: string
  ): Promise<ValidationResult> {
    try {
      // First get the AI qualification result
      const qualificationResult = await this.isProjectQualified(initiative);
      
      // If it's not qualified as a project, return early with explanation
      if (!qualificationResult.isProject || qualificationResult.confidence <= 0.7) {
        return {
          isValidProject: false,
          confidence: qualificationResult.confidence,
          hasCompanyInfo: !!companyName,
          feedback: `Based on my analysis, this doesn't appear to qualify as a project. ${qualificationResult.reasoning}`,
          suggestions: [
            "Could you describe a specific business outcome you want to achieve?",
            "What unique product, service, or process improvement are you looking to create?",
            "Do you have a defined timeframe and budget in mind?",
            "Is this for a business or organizational context?"
          ],
          nextSteps: [
            "Reframe your request as a temporary endeavor with specific deliverables",
            "Include business context and desired outcomes",
            "Specify what unique value you want to create"
          ],
          qualificationResult
        };
      }

      const response = await this.validationChain.invoke({
        initiative,
        companyName: companyName || "Not provided"
      });

      // Parse the JSON response
      const result = JSON.parse(response);
      
      return {
        isValidProject: result.isValidProject,
        confidence: result.confidence,
        hasCompanyInfo: result.hasCompanyInfo,
        feedback: result.feedback,
        suggestions: result.suggestions || [],
        nextSteps: result.nextSteps || [],
        projectCriteria: result.projectCriteria,
        qualificationResult
      };
    } catch (error) {
      console.error('Project validation error:', error);
      return {
        isValidProject: false,
        confidence: 0,
        hasCompanyInfo: !!companyName,
        feedback: "I encountered an error while validating your initiative. Let me help you structure it properly.",
        suggestions: [
          "What specific problem are you trying to solve?",
          "What features or deliverables do you want to create?",
          "What's your timeline for completing this?",
          ...(companyName ? [] : ["What company is this project for?"])
        ],
        nextSteps: [
          "Provide more details about your project goals",
          "Share your estimated budget or team size",
          "Specify when you need this completed"
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
    try {
      // Use web search to get company information
      const searchResponse = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${companyName} company employees revenue headquarters location`
        })
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        
        // Extract company information from search results
        const companyInfo = this.extractCompanyInfoFromSearch(companyName, searchData.results);
        return companyInfo;
      }
    } catch (error) {
      console.error('Company enrichment error:', error);
    }

    // Fallback to basic info
    return {
      name: companyName,
      description: 'Company information not available'
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

  async processUserInput(
    input: string,
    state: ConversationState
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

    // Check if this looks like a new project initiative
    const isNewInitiative = await this.isLikelyNewInitiative(input);
    
    if (isNewInitiative || !state.hasValidProject) {
      // Validate as potential project
      const validation = await this.validateInitiative(input, currentCompanyName);
      
      let response: string;
      
      if (validation.isValidProject && validation.hasCompanyInfo) {
        response = `Great! I've validated your project initiative. ${validation.feedback}\n\nNext steps:\n${validation.nextSteps.map(step => `• ${step}`).join('\n')}`;
      } else if (validation.isValidProject && !validation.hasCompanyInfo) {
        response = `Your initiative looks like a valid project! However, I need your company name to provide more targeted guidance. ${validation.feedback}\n\nCould you please share your company name?`;
      } else {
        response = `I can help you develop this into a proper project. ${validation.feedback}\n\nSuggestions:\n${validation.suggestions.map(s => `• ${s}`).join('\n')}\n\nWould you like to work on any of these aspects?`;
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

  private async isLikelyNewInitiative(input: string): Promise<boolean> {
    // Use OpenAI API to intelligently determine if this is a project initiative
    const qualification = await this.isProjectQualified(input);
    return qualification.isProject && qualification.confidence > 0.7;
  }

  private async isProjectQualified(input: string): Promise<ProjectQualificationResult> {
    try {
      // Create a specialized prompt for project qualification
      const qualificationPrompt = ChatPromptTemplate.fromMessages([
        ["system", `You are an expert project analyst. Your job is to determine if a user's input qualifies as a PROJECT based on this specific definition:

"A project is a temporary endeavor, undertaken to create a unique process improvement, product, service, or result within a defined timeframe and budget. Unlike ongoing, repetitive operations, a project has a clear start and end date, a specific goal, and involves a series of planned tasks and resources to achieve a desired outcome. Common examples include building a house, launching a new product, planning a major event or simplifying an SAP workflow."

QUALIFICATION CRITERIA:
✅ QUALIFIES as a project if the input describes:
- A temporary endeavor (not ongoing operations)
- Creating something unique (product, service, process improvement, result)
- Has potential for defined timeframe and budget
- Involves planned tasks to achieve specific outcomes
- Business/organizational context

❌ DOES NOT QUALIFY if the input is:
- General questions (weather, "what is...", "how to...")
- Shopping queries (finding cheapest products, buying items)
- Personal activities (recipes, entertainment, travel planning)
- Ongoing operational tasks (daily maintenance, routine work)
- Academic questions without business context

RESPONSE FORMAT - Respond with ONLY a JSON object:
{
  "isProject": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "brief explanation of why it qualifies or doesn't qualify"
}

Be strict but fair. If unsure, err on the side of caution (false).`],
        ["human", "Analyze this input: {input}"]
      ]);

      const qualificationChain = RunnableSequence.from([
        qualificationPrompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await qualificationChain.invoke({ input });
      
      // Parse the JSON response
      const result = JSON.parse(response);
      
      // Log the reasoning for debugging
      console.log(`Project qualification for "${input}":`, result);
      
      // Add debug information for qualification result
      console.log(`[DEBUG] o3-mini qualification analysis:`, {
        input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
        result: {
          isProject: result.isProject,
          confidence: result.confidence,
          reasoning: result.reasoning
        },
        model: 'o3-mini',
        timestamp: new Date().toISOString()
      });
      
      return {
        isProject: result.isProject,
        confidence: result.confidence,
        reasoning: result.reasoning
      };
      
    } catch (error) {
      console.error('Project qualification error:', error);
      
      // Fallback to basic keyword check if API fails
      const basicKeywords = ['project', 'build', 'create', 'develop', 'implement', 'launch', 'improve'];
      const lowercaseInput = input.toLowerCase();
      const hasKeywords = basicKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      return {
        isProject: hasKeywords,
        confidence: hasKeywords ? 0.6 : 0.2,
        reasoning: hasKeywords 
          ? "Fallback analysis detected project-related keywords" 
          : "No clear project indicators found in fallback analysis"
      };
    }
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
• Validate if your initiative qualifies as a proper project
• Ensure you have clear scope, budget, and timeline
• Guide you through structuring your ideas into project format
• Capture your company information for better context

Please share your project initiative or business idea, and I'll help you develop it into a structured project proposal.

**What makes a valid project:**
✅ Clearly defined scope (goals, deliverables, success criteria)
✅ Calculable budget (provided or estimable)  
✅ Fixed timeline (start/end dates or duration)
✅ Company context for tailored guidance

What project idea would you like to work on?`;
  }
}

// Export singleton instance
export const projectValidationAgent = new ProjectValidationAgent();
