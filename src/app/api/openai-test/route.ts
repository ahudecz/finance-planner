import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required and must be a string'
      }, { status: 400 });
    }

    console.log('🤖 Testing LangChain ChatOpenAI with o3-mini model, prompt:', prompt.substring(0, 100) + '...');
    
    // Create ChatOpenAI instance with o3-mini configuration
    const chatModel = new ChatOpenAI({
      modelName: "o3-mini",
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelKwargs: {
        reasoning_effort: "low",
        max_completion_tokens: 1000
      }
    });

    // Use LangChain's invoke method
    const startTime = Date.now();
    const response = await chatModel.invoke([
      {
        role: "user",
        content: prompt
      }
    ]);
    const processingTime = Date.now() - startTime;

    if (!response.content) {
      throw new Error('No response from LangChain ChatOpenAI');
    }

    console.log('✅ LangChain ChatOpenAI test successful');

    return NextResponse.json({
      success: true,
      response: response.content,
      model: "o3-mini (via LangChain)",
      processingTime: processingTime,
      responseType: response.constructor.name,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LangChain ChatOpenAI test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check if OPENAI_API_KEY is set correctly in .env.local and LangChain supports o3-mini'
    }, { status: 500 });
  }
}
