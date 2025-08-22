import { NextResponse } from 'next/server';
import { openaiAnalyst } from '@/lib/services/openaiService';

export async function GET() {
  try {
    console.log('🔌 Testing OpenAI connection...');
    
    const isConnected = await openaiAnalyst.testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'OpenAI connection successful!',
        model: 'gpt-4-turbo-preview',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'OpenAI connection failed',
        error: 'Connection test returned false'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ OpenAI connection test error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'OpenAI connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check if OPENAI_API_KEY is set correctly in .env.local'
    }, { status: 500 });
  }
}