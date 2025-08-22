import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const currentModel = process.env.OPENAI_MODEL || 'gpt-4o';
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    
    return NextResponse.json({
      current_model: currentModel,
      has_api_key: hasApiKey,
      api_key_preview: hasApiKey ? 
        `${process.env.OPENAI_API_KEY?.substring(0, 7)}...${process.env.OPENAI_API_KEY?.substring(-4)}` : 
        'Not set',
      available_models: {
        current: [
          {
            id: "gpt-4o",
            name: "GPT-4o",
            description: "Latest GPT-4 variant - faster, multimodal",
            status: "available",
            recommended: true
          },
          {
            id: "gpt-4-turbo",
            name: "GPT-4 Turbo", 
            description: "Best for complex analysis tasks",
            status: "available"
          },
          {
            id: "gpt-4-turbo-preview",
            name: "GPT-4 Turbo Preview",
            description: "Preview version with latest features", 
            status: "available"
          },
          {
            id: "gpt-4",
            name: "GPT-4",
            description: "Original GPT-4 model",
            status: "available"
          }
        ],
        future: [
          {
            id: "gpt-5",
            name: "GPT-5", 
            description: "Next generation model (not yet released)",
            status: "coming_soon",
            eta: "TBD - Follow OpenAI announcements"
          }
        ]
      },
      instructions: {
        change_model: "Set OPENAI_MODEL in .env.local to: gpt-4o, gpt-4-turbo, etc.",
        for_gpt5: "When GPT-5 is released, just set OPENAI_MODEL=gpt-5",
        current_best: "gpt-4o (fastest) or gpt-4-turbo (most capable)"
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting model info:', error);
    
    return NextResponse.json({
      error: 'Failed to get model information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}