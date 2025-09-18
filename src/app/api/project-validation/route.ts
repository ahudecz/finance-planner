import { NextRequest, NextResponse } from 'next/server';
import { projectValidationAgent, ConversationState } from '@/lib/services/projectValidationService';

// Streaming handler for thinking steps
async function handleStreamingProcess(input: string, conversationState: ConversationState) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Debug callback to emit debug logs via streaming
      const debugCallback = (type: 'ai_parse_failure' | 'ai_missing_score' | 'api_error_fallback', title: string, details: any) => {
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
            expectedTime: '5-60 seconds for full AI analysis',
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
          setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000);
        });

        let result;
        try {
          // Stream validation sub-steps while AI is processing
          const processingPromise = projectValidationAgent.processUserInput(input, conversationState, false, debugCallback);
          
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
          console.log('AI processing timed out, using quick mode fallback');
          
          // Send fallback mode notification
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'debug',
            category: 'fallback_mode',
            title: '⚡ Quick Mode Activated',
            details: {
              reason: 'AI processing took longer than 60 seconds',
              mode: 'Local keyword analysis + structured checklist',
              impact: 'Response generated instantly using built-in logic',
              quality: 'Good - still provides useful project guidance'
            }
          })}\n\n`));
          
          result = await projectValidationAgent.processUserInput(input, conversationState, true, debugCallback);
        }
        
        // Send final result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'result',
          success: true,
          message: result.response,
          validation: result.validation,
          conversationState: result.updatedState
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
              }
            ],
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
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000);
        });
        
        let result;
        try {
          result = await Promise.race([
            projectValidationAgent.processUserInput(input, conversationState),
            timeoutPromise
          ]);
        } catch (timeoutError) {
          // If AI processing times out, use quick mode
          console.log('AI processing timed out, using quick mode fallback');
          result = await projectValidationAgent.processUserInput(input, conversationState, true);
        }
        
        return NextResponse.json({
          success: true,
          message: result.response,
          validation: result.validation,
          conversationState: result.updatedState
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
