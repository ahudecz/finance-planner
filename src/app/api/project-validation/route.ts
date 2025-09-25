import { NextRequest, NextResponse } from 'next/server';
import { projectValidationAgent, ConversationState } from '@/lib/services/projectValidationService';

// Configure API route timeout for Vercel/Next.js
export const maxDuration = 300; // 5 minutes (300 seconds) - maximum allowed on Vercel Pro
export const dynamic = 'force-dynamic';

// Development server timeout workaround
const isDevelopment = process.env.NODE_ENV === 'development';
const DEVELOPMENT_TIMEOUT = isDevelopment ? 30000 : 150000; // 30s for dev, 150s for prod

// Debug logging for timeout values
console.log('🔧 TIMEOUT DEBUG:', {
  NODE_ENV: process.env.NODE_ENV,
  isDevelopment,
  DEVELOPMENT_TIMEOUT,
  timeoutInSeconds: DEVELOPMENT_TIMEOUT / 1000
});

// Note: config export is for Pages Router only, not App Router
// App Router uses maxDuration export instead

// Web search function for company enrichment
async function performWebSearch(query: string): Promise<any[]> {
  try {
    console.log(`🔍 Web search for: ${query}`);
    
    // Use web_search tool available in the API context
    // Determine the current server's base URL dynamically
    const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || '3000'}`;
    const searchResponse = await fetch(`${baseUrl}/api/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      return searchData.results || [];
    }
    
    return [];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

// Streaming handler for thinking steps
async function handleStreamingProcess(input: string, conversationState: ConversationState) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Debug callback to emit debug logs via streaming
      const debugCallback = (type: 'ai_parse_failure' | 'ai_missing_score' | 'api_error_fallback' | 'ai_field_calculation', title: string, details: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'debug',
            category: type,
            title,
            details
          })}\n\n`));
        } catch (error) {
          console.error('Failed to send debug log:', error);
        }
      };
      try {
        // Stream real processing steps
        const processingSteps = [
          { step: "🔍 Analyzing project potential", detail: "Checking if input has business project characteristics..." },
          { step: "🤖 Calling OpenAI o3-mini", detail: "Sending request to AI model for validation..." },
          { step: "📊 Processing AI response", detail: "Parsing and validating AI analysis results..." },
          { step: "🏢 Extracting company context", detail: "Identifying organization information..." },
          { step: "✅ Generating validation result", detail: "Compiling final assessment and recommendations..." }
        ];

        const totalSteps = processingSteps.length + 4; // 5 main steps + 4 validation sub-steps
        
        for (let i = 0; i < processingSteps.length; i++) {
          const { step, detail } = processingSteps[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'thinking',
            step: i + 1,
            total: totalSteps,
            content: `${step}\n${detail}`
          })}\n\n`));
          
          // Shorter delays for real processing feedback
          await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
        }

        // Track precise timing for AI analysis
        const aiAnalysisStartTime = Date.now();
        
        // Send debug info about starting processing
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'debug',
          category: 'api_call',
          title: '🚀 Starting Project Analysis',
          details: {
            summary: `Analyzing ${input.length} characters of input using OpenAI's o3-mini model`,
            model: 'OpenAI o3-mini with medium reasoning effort',
            context: conversationState.messages.length > 1 ? 'Continuing previous conversation' : 'Starting new conversation',
            expectedTime: `5-${DEVELOPMENT_TIMEOUT/1000} seconds for full AI analysis`,
            startTime: new Date(aiAnalysisStartTime).toLocaleTimeString()
          }
        })}\n\n`));

        // Don't send analysis block - we'll stream real processing steps instead

        // Add detailed sub-steps for validation result generation
        const validationSubSteps = [
          { step: "📋 Creating project checklist", detail: "Building customized completion checklist based on analysis..." },
          { step: "🎯 Calculating readiness score", detail: "Evaluating project definition completeness (scope, budget, timeline)..." },
          { step: "💡 Generating next steps", detail: "Creating actionable recommendations for project development..." },
          { step: "📝 Compiling feedback", detail: "Preparing personalized guidance and assessment summary..." }
        ];

        // Process the actual request with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const actualTimeoutDuration = Date.now() - aiAnalysisStartTime;
            console.log(`⏰ TIMEOUT PROMISE triggered after ${actualTimeoutDuration}ms (expected ${DEVELOPMENT_TIMEOUT}ms) at ${new Date().toISOString()}`);
            reject(new Error(`Request timeout after ${DEVELOPMENT_TIMEOUT/1000} seconds`));
          }, DEVELOPMENT_TIMEOUT);
        });

        let result;
        try {
          console.log(`🚀 Starting AI processing at ${new Date().toISOString()}`);
          // Stream validation sub-steps while AI is processing
          const processingPromise = projectValidationAgent.processUserInput(input, conversationState, false, debugCallback, performWebSearch)
            .then(result => {
              const completionTime = Date.now() - aiAnalysisStartTime;
              console.log(`✅ PROCESSING PROMISE completed after ${completionTime}ms at ${new Date().toISOString()}`);
              return result;
            })
            .catch(error => {
              const errorTime = Date.now() - aiAnalysisStartTime;
              console.log(`❌ PROCESSING PROMISE failed after ${errorTime}ms at ${new Date().toISOString()}: ${error.message}`);
              throw error;
            });
          
          // Start streaming validation sub-steps after a short delay (AI should be processing by then)
          setTimeout(async () => {
            for (let i = 0; i < validationSubSteps.length; i++) {
              const { step, detail } = validationSubSteps[i];
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'thinking',
                step: 5 + i + 1, // Continue from step 5 (after the main processing steps)
                total: totalSteps,
                content: `${step}\n${detail}`
              })}\n\n`));
              
              // Shorter delays for sub-steps
              await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
            }
          }, 2000); // Start sub-steps after 2 seconds
          
          result = await Promise.race([
            processingPromise,
            timeoutPromise
          ]);
          
          // Calculate precise processing time
          const aiAnalysisEndTime = Date.now();
          const processingTimeMs = aiAnalysisEndTime - aiAnalysisStartTime;
          const processingTimeSeconds = (processingTimeMs / 1000).toFixed(2);
          
          // Send success debug message for normal AI processing
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'debug',
            category: 'ai_success',
            title: '🤖 AI Analysis Complete',
            details: {
              model: 'OpenAI o3-mini',
              processingTime: `${processingTimeMs}ms (${processingTimeSeconds}s)`,
              startTime: new Date(aiAnalysisStartTime).toLocaleTimeString(),
              endTime: new Date(aiAnalysisEndTime).toLocaleTimeString(),
              mode: 'Full AI reasoning with project validation',
              quality: 'High - personalized analysis based on your input'
            }
          })}\n\n`));
          
        } catch (timeoutError) {
          // If AI processing times out, use quick mode
          const timeoutTime = Date.now();
          const actualTimeoutDuration = timeoutTime - aiAnalysisStartTime;
          console.log(`🚨 AI processing timed out after ${actualTimeoutDuration}ms (${(actualTimeoutDuration/1000).toFixed(2)}s) at ${new Date().toISOString()}, using quick mode fallback`);
          
          // Send fallback mode notification
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'debug',
            category: 'fallback_mode',
            title: '⚡ Quick Mode Activated',
            details: {
              reason: `AI processing took longer than ${DEVELOPMENT_TIMEOUT/1000} seconds`,
              mode: 'Local keyword analysis + structured checklist',
              impact: 'Response generated instantly using built-in logic',
              quality: 'Good - still provides useful project guidance'
            }
          })}\n\n`));
          
          result = await projectValidationAgent.processUserInput(input, conversationState, true, debugCallback, performWebSearch);
        }
        
        // Send final result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'result',
          success: true,
          message: (result as any).response,
          validation: (result as any).validation,
          conversationState: (result as any).updatedState
        })}\n\n`));
        
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        
        // Send error fallback debug message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'debug',
          category: 'error_fallback',
          title: '🔧 Emergency Fallback Mode',
          details: {
            reason: 'Both AI processing and quick mode encountered errors',
            mode: 'Static response with default project checklist',
            impact: 'Basic guidance provided, functionality maintained',
            quality: 'Basic - generic project structure guidance'
          }
        })}\n\n`));
        
        // Send fallback response instead of just error
        const fallbackResponse = {
          response: "I'm having trouble processing your request right now, but I can still help you structure your project! Let me provide some guidance based on what you've shared.",
          validation: {
            isValidProject: false,
            projectQualificationPotential: 40,
            projectDefinitionReadiness: 20,
            hasCompanyInfo: false,
            feedback: "I'm experiencing technical difficulties, but I can help you develop your project idea step by step.",
            completionChecklist: [
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
              }
            ],
            nextSteps: [
              "Define the purpose and vision for your product",
              "Identify your target market and users",
              "Clarify the problem you're solving and benefits you'll provide"
            ],
            productVisionCriteria: {
              vision: "Needs definition",
              targetGroup: "Not identified",
              needs: "Not specified", 
              product: "Not defined",
              businessGoals: "Not specified"
            }
          },
          updatedState: conversationState
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'result',
          success: true,
          message: fallbackResponse.response,
          validation: fallbackResponse.validation,
          conversationState: fallbackResponse.updatedState
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, input, conversationState } = body;

    switch (action) {
      case 'welcome':
        const welcomeMessage = await projectValidationAgent.getWelcomeMessage();
        const initialState = projectValidationAgent.createInitialState();
        
        return NextResponse.json({
          success: true,
          message: welcomeMessage,
          conversationState: initialState
        });

      case 'process':
        if (!input || !conversationState) {
          return NextResponse.json({
            success: false,
            error: 'Input and conversation state are required'
          }, { status: 400 });
        }

        // Check if streaming is requested
        if (body.stream) {
          return await handleStreamingProcess(input, conversationState);
        }

        // Add timeout for non-streaming requests too
        const startTime = Date.now();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log(`⏰ Non-streaming request timeout triggered after ${DEVELOPMENT_TIMEOUT/1000} seconds at ${new Date().toISOString()}`);
            reject(new Error(`Request timeout after ${DEVELOPMENT_TIMEOUT/1000} seconds`));
          }, DEVELOPMENT_TIMEOUT);
        });
        
        let result;
        try {
          console.log(`🚀 Starting non-streaming AI processing at ${new Date().toISOString()}`);
          result = await Promise.race([
            projectValidationAgent.processUserInput(input, conversationState, false, undefined, performWebSearch),
            timeoutPromise
          ]);
        } catch (timeoutError) {
          // If AI processing times out, use quick mode
          const timeoutTime = Date.now();
          const actualTimeoutDuration = timeoutTime - startTime;
          console.log(`🚨 Non-streaming AI processing timed out after ${actualTimeoutDuration}ms (${(actualTimeoutDuration/1000).toFixed(2)}s) at ${new Date().toISOString()}, using quick mode fallback`);
          result = await projectValidationAgent.processUserInput(input, conversationState, true, undefined, performWebSearch);
        }
        
        return NextResponse.json({
          success: true,
          message: (result as any).response,
          validation: (result as any).validation,
          conversationState: (result as any).updatedState
        });

      case 'validate':
        if (!input) {
          return NextResponse.json({
            success: false,
            error: 'Input is required for validation'
          }, { status: 400 });
        }

        const validation = await projectValidationAgent.validateInitiative(
          input,
          body.companyName
        );
        
        return NextResponse.json({
          success: true,
          validation
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Project validation API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Project Validation API is running',
    endpoints: {
      'POST /': {
        actions: ['welcome', 'process', 'validate'],
        description: 'Main endpoint for project validation workflow'
      }
    }
  });
}
