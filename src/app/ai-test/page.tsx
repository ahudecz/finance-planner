"use client";

import { useState, useEffect } from "react";
import { 
  Brain, 
  Play, 
  RotateCcw, 
  Lightbulb,
  Moon,
  Sun,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Zap,
  Bot
} from "lucide-react";
import { clsx } from "clsx";
import { ConversationState, ValidationResult } from "@/lib/services/projectValidationService";
import { ProjectValidationMessage } from "@/components/ProjectValidationMessage";

interface ThinkingStep {
  step: number;
  total: number;
  content: string;
}

interface DebugLogEntry {
  id: string;
  timestamp: Date;
  type: 'api_call' | 'thinking' | 'qualification' | 'validation' | 'company_search' | 'response' | 'ai_success' | 'fallback_mode' | 'error_fallback' | 'ai_parse_failure' | 'ai_missing_score' | 'api_error_fallback';
  title: string;
  details: any;
  duration?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system' | 'validation' | 'welcome' | 'thinking' | 'analysis';
  content: string;
  timestamp: Date;
  validation?: ValidationResult;
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
  thinkingSteps?: ThinkingStep[];
  fallbackMode?: 'quick' | 'error' | null;
  analysisDetails?: {
    inputLength: number;
    model: string;
    context: string;
    expectedTime: string;
  };
}

interface ProjectValidationState {
  conversationState: ConversationState | null;
  isLoading: boolean;
  hasValidProject: boolean;
  companyName?: string;
}

// TODO: REMOVE THIS INTERFACE WHEN LANGCHAIN TEST BLOCK IS REMOVED
interface OpenAITestState {
  isLoading: boolean;
  result: string | null;
  error: string | null;
  prompt: string;
}

export default function AITestPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [validationState, setValidationState] = useState<ProjectValidationState>({
    conversationState: null,
    isLoading: false,
    hasValidProject: false
  });
  const [currentThinking, setCurrentThinking] = useState<ThinkingStep | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [currentFallbackMode, setCurrentFallbackMode] = useState<'quick' | 'error' | null>(null);
  const [messageCounter, setMessageCounter] = useState(() => Math.floor(Math.random() * 1000));
  
  // TODO: REMOVE THIS STATE WHEN LANGCHAIN TEST BLOCK IS REMOVED
  // OpenAI Test State
  const [openaiTest, setOpenaiTest] = useState<OpenAITestState>({
    isLoading: false,
    result: null,
    error: null,
    prompt: "Hello! Please respond with a simple greeting and tell me what you are."
  });

  // Initialize the conversation on component mount
  useEffect(() => {
    initializeConversation();
  }, []);

  // Helper function to add debug log entries
  const addDebugLog = (type: DebugLogEntry['type'], title: string, details: any, duration?: number) => {
    const logEntry: DebugLogEntry = {
      id: `debug-${debugLogs.length}-${type}-${Date.now()}`,
      timestamp: new Date(),
      type,
      title,
      details,
      duration
    };
    setDebugLogs(prev => [...prev, logEntry]);
  };

  const initializeConversation = async () => {
    try {
      const response = await fetch('/api/project-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'welcome' })
      });

      const data = await response.json();
      
      if (data.success) {
        const welcomeMessage: ChatMessage = {
          id: `welcome-${messageCounter}`,
          type: 'welcome',
          content: data.message,
          timestamp: new Date()
        };
        setMessageCounter(prev => prev + 1);
        
        setChatMessages([welcomeMessage]);
        setValidationState(prev => ({
          ...prev,
          conversationState: data.conversationState
        }));
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || validationState.isLoading || !validationState.conversationState) return;
    
    const userMessage: ChatMessage = {
      id: `user-${messageCounter}`,
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };
    setMessageCounter(prev => prev + 1);
    
    setChatMessages(prev => [...prev, userMessage]);
    const messageToProcess = currentMessage;
    setCurrentMessage("");
    setValidationState(prev => ({ ...prev, isLoading: true }));
    setCurrentThinking(null);
    setCurrentFallbackMode(null);
    
    // Add debug log for starting request
    const requestStartTime = Date.now();
    addDebugLog('api_call', 'Starting Project Validation Request', {
      input: messageToProcess,
      stream: true,
      conversationState: validationState.conversationState ? 'Present' : 'None'
    });
    
    // Create AbortController with 160-second timeout (10 seconds longer than server timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Client-side timeout after 160 seconds, aborting fetch');
      controller.abort();
    }, 160000); // 160 seconds - longer than server timeout to allow server-side fallback

    try {
      const response = await fetch('/api/project-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process',
          input: messageToProcess,
          conversationState: validationState.conversationState,
          stream: true
        }),
        signal: controller.signal
      });

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'thinking') {
                  setCurrentThinking({
                    step: data.step,
                    total: data.total,
                    content: data.content
                  });
                  
                  // Add debug log for thinking step
                  addDebugLog('thinking', `AI Thinking Step ${data.step}/${data.total}`, {
                    step: data.step,
                    total: data.total,
                    content: data.content
                  });
                } else if (data.type === 'analysis') {
                  // Handle analysis status message
                  const analysisMessage: ChatMessage = {
                    id: `analysis-${messageCounter}`,
                    type: 'analysis',
                    content: data.content,
                    timestamp: new Date(),
                    status: 'in_progress',
                    analysisDetails: data.analysisDetails
                  };
                  setMessageCounter(prev => prev + 1);
                  
                  setChatMessages(prev => [...prev, analysisMessage]);
                } else if (data.type === 'debug') {
                  // Handle debug messages from backend
                  addDebugLog(data.category as DebugLogEntry['type'], data.title, data.details);
                  
                  // Track fallback mode
                  if (data.category === 'fallback_mode') {
                    setCurrentFallbackMode('quick');
                  } else if (data.category === 'error_fallback') {
                    setCurrentFallbackMode('error');
                  } else if (data.category === 'ai_success') {
                    setCurrentFallbackMode(null);
                  }
                } else if (data.type === 'result' && data.success) {
                  setCurrentThinking(null);
                  
                  // Remove the analysis message and replace with final result
                  const aiMessage: ChatMessage = {
                    id: `ai-${chatMessages.length + 1}`,
                    type: data.validation ? 'validation' : 'ai',
                    content: data.message,
                    timestamp: new Date(),
                    validation: data.validation,
                    fallbackMode: currentFallbackMode
                  };
                  
                  setChatMessages(prev => {
                    // Remove any analysis messages and add the final result
                    const filteredMessages = prev.filter(msg => msg.type !== 'analysis');
                    return [...filteredMessages, aiMessage];
                  });
                  
                  // Add debug log for final response
                  const requestDuration = Date.now() - requestStartTime;
                  addDebugLog('response', 'AI Response Generated', {
                    hasValidation: !!data.validation,
                    hasValidProject: data.conversationState?.hasValidProject,
                    companyName: data.conversationState?.companyName,
                    companyInfo: data.conversationState?.companyInfo,
                    qualificationResult: data.validation?.qualificationResult
                  }, requestDuration);
                  
                  setValidationState(prev => ({
                    ...prev,
                    conversationState: data.conversationState,
                    hasValidProject: data.conversationState.hasValidProject,
                    companyName: data.conversationState.companyName,
                    isLoading: false
                  }));
                } else if (data.type === 'error') {
                  setCurrentThinking(null);
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError);
              }
            }
          }
        }
      } else {
        // Fallback to regular request if streaming not supported
        const data = await response.json();
        
        if (data.success) {
          const aiMessage: ChatMessage = {
            id: `ai-${chatMessages.length + 1}`,
            type: data.validation ? 'validation' : 'ai',
            content: data.message,
            timestamp: new Date(),
            validation: data.validation
          };
          
          setChatMessages(prev => [...prev, aiMessage]);
          
          setValidationState(prev => ({
            ...prev,
            conversationState: data.conversationState,
            hasValidProject: data.conversationState.hasValidProject,
            companyName: data.conversationState.companyName,
            isLoading: false
          }));
        }
      }
      
      // Clear timeout on successful completion
      clearTimeout(timeoutId);
    } catch (error) {
      // Always clear the timeout on any error
      clearTimeout(timeoutId);
      
      console.error('Failed to process message:', error);
      setCurrentThinking(null);
      
      const errorMessage: ChatMessage = {
        id: `error-${chatMessages.length + 1}`,
        type: 'system',
        content: 'I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
        status: 'error'
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      setValidationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleReset = async () => {
    setChatMessages([]);
    setCurrentMessage("");
    setCurrentThinking(null);
    setDebugLogs([]);
    setValidationState({
      conversationState: null,
      isLoading: false,
      hasValidProject: false
    });
    
    // Reinitialize conversation
    await initializeConversation();
  };

  // TODO: REMOVE THIS FUNCTION WHEN LANGCHAIN TEST BLOCK IS REMOVED
  const testOpenAIAPI = async () => {
    setOpenaiTest(prev => ({ ...prev, isLoading: true, result: null, error: null }));
    
    try {
      const response = await fetch('/api/openai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: "Hello! Please respond with a simple greeting and confirm you are working via LangChain." })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOpenaiTest(prev => ({ 
          ...prev, 
          isLoading: false, 
          result: `✅ LangChain Connection successful!\nModel: ${data.model}\nProcessing Time: ${data.processingTime}ms\nResponse Type: ${data.responseType}\nResponse: ${data.response}\nTimestamp: ${data.timestamp}`,
          error: null 
        }));
      } else {
        setOpenaiTest(prev => ({ 
          ...prev, 
          isLoading: false, 
          result: null,
          error: `❌ LangChain Connection failed: ${data.error}\n${data.hint || ''}` 
        }));
      }
    } catch (error) {
      setOpenaiTest(prev => ({ 
        ...prev, 
        isLoading: false, 
        result: null,
        error: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  // TODO: REMOVE THIS FUNCTION WHEN LANGCHAIN TEST BLOCK IS REMOVED
  const testOpenAIChat = async () => {
    if (!openaiTest.prompt.trim()) return;
    
    setOpenaiTest(prev => ({ ...prev, isLoading: true, result: null, error: null }));
    
    try {
      const response = await fetch('/api/openai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: openaiTest.prompt })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOpenaiTest(prev => ({ 
          ...prev, 
          isLoading: false, 
          result: data.response,
          error: null 
        }));
      } else {
        setOpenaiTest(prev => ({ 
          ...prev, 
          isLoading: false, 
          result: null,
          error: `❌ Chat failed: ${data.error}` 
        }));
      }
    } catch (error) {
      setOpenaiTest(prev => ({ 
        ...prev, 
        isLoading: false, 
        result: null,
        error: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  return (
    <div className={clsx(
      "min-h-screen p-4 transition-colors duration-300",
      isDarkMode 
        ? "bg-gray-900 text-white" 
        : "bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50"
    )}>
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center space-x-3 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={clsx("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>AI Project Validator</h1>
                <p className={clsx("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                  Validate and structure your project initiatives with AI guidance
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {validationState.hasValidProject && validationState.conversationState?.companyInfo && (
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <div className={clsx("text-xs", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                    <div className="font-medium">{validationState.conversationState.companyInfo.name}</div>
                    <div className="flex items-center space-x-2 text-xs opacity-75">
                      {validationState.conversationState.companyInfo.employees && (
                        <span>👥 {validationState.conversationState.companyInfo.employees}</span>
                      )}
                      {validationState.conversationState.companyInfo.nsv && (
                        <span>💰 {validationState.conversationState.companyInfo.nsv}</span>
                      )}
                      {validationState.conversationState.companyInfo.country && (
                        <span>🌍 {validationState.conversationState.companyInfo.country}</span>
                      )}
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}
              {validationState.hasValidProject && validationState.companyName && !validationState.conversationState?.companyInfo && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className={clsx("text-xs", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                    Valid Project ({validationState.companyName})
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className={clsx(
                  "p-2 rounded-lg transition-colors text-sm",
                  isDarkMode
                    ? "bg-gray-800 hover:bg-gray-700 text-blue-400"
                    : "bg-white hover:bg-gray-100 text-gray-600 border"
                )}
                title="Toggle Debug Panel"
              >
                <span className="text-xs font-mono">DEBUG</span>
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={clsx(
                  "p-2 rounded-lg transition-colors text-sm",
                  isDarkMode
                    ? "bg-gray-800 hover:bg-gray-700 text-yellow-400"
                    : "bg-white hover:bg-gray-100 text-gray-600 border"
                )}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 
        =============================================================================
        TODO: REMOVE THIS ENTIRE BLOCK WHEN EVERYTHING WORKS PROPERLY
        =============================================================================
        This is a temporary LangChain ChatOpenAI test panel used for debugging
        o3-mini model compatibility. Once the main project validation is stable,
        this entire block should be deleted from lines [CURRENT_LINE] to [END_LINE].
        
        The test confirms LangChain works with o3-mini, so it can be safely removed
        once the main application is functioning correctly.
        =============================================================================
        */}
        {false && ( // Set to true to show the test panel, false to hide it
        <div className="max-w-4xl mx-auto mb-6">
          <div className={clsx(
            "rounded-xl shadow-lg border p-6",
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={clsx("font-semibold text-lg", isDarkMode ? "text-white" : "text-gray-900")}>
                    LangChain ChatOpenAI Test
                  </h3>
                  <p className={clsx("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                    Test LangChain&apos;s ChatOpenAI wrapper with o3-mini model
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Connection Test */}
              <div className={clsx(
                "p-4 rounded-lg border",
                isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={clsx("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                    LangChain Connection Test
                  </h4>
                  <button
                    onClick={testOpenAIAPI}
                    disabled={openaiTest.isLoading}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                      openaiTest.isLoading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    {openaiTest.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Testing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="w-3 h-3" />
                        <span>Test Connection</span>
                      </div>
                    )}
                  </button>
                </div>
                
                {(openaiTest.result || openaiTest.error) && (
                  <div className={clsx(
                    "p-3 rounded text-sm font-mono whitespace-pre-wrap",
                    openaiTest.error
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  )}>
                    {openaiTest.error || openaiTest.result}
                  </div>
                )}
              </div>

              {/* Chat Test */}
              <div className={clsx(
                "p-4 rounded-lg border",
                isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={clsx("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                    LangChain Chat Test
                  </h4>
                  <button
                    onClick={testOpenAIChat}
                    disabled={openaiTest.isLoading || !openaiTest.prompt.trim()}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                      openaiTest.isLoading || !openaiTest.prompt.trim()
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    )}
                  >
                    {openaiTest.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Bot className="w-3 h-3" />
                        <span>Test Chat</span>
                      </div>
                    )}
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                      Test Prompt:
                    </label>
                    <textarea
                      value={openaiTest.prompt}
                      onChange={(e) => setOpenaiTest(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Enter your test prompt..."
                      rows={2}
                      className={clsx(
                        "w-full px-3 py-2 border rounded-lg text-sm resize-none",
                        isDarkMode
                          ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                          : "border-gray-300 bg-white"
                      )}
                    />
                  </div>
                  
                  {(openaiTest.result || openaiTest.error) && (
                    <div>
                      <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                        Response:
                      </label>
                      <div className={clsx(
                        "p-3 rounded text-sm max-h-32 overflow-y-auto",
                        openaiTest.error
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      )}>
                        {openaiTest.error || openaiTest.result}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
        {/* 
        =============================================================================
        END OF TEMPORARY TEST BLOCK - DELETE EVERYTHING ABOVE THIS COMMENT
        =============================================================================
        */}

        {/* Main Interface with Debug Panel */}
        <div className={clsx(
          "h-[calc(100vh-200px)] mx-auto flex gap-4",
          showDebugPanel ? "max-w-7xl" : "max-w-4xl"
        )}>
          {/* Chat Interface */}
          <div className={clsx(
            "h-full rounded-xl shadow-lg border flex flex-col",
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
            showDebugPanel ? "flex-1" : "w-full"
          )}>
            {/* Chat Header */}
            <div className={clsx(
              "p-4 border-b",
              isDarkMode ? "border-gray-700" : "border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <h3 className={clsx("font-semibold text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                  Project Validation Workflow {validationState.isLoading && "• Processing..."}
                </h3>
                <div className="flex items-center space-x-2">
                  {validationState.isLoading && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                  <button
                    onClick={handleReset}
                    className={clsx(
                      "p-1 rounded transition-colors",
                      isDarkMode
                        ? "hover:bg-gray-700 text-gray-400"
                        : "hover:bg-gray-100 text-gray-600"
                    )}
                    title="Reset conversation"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && !validationState.isLoading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={clsx("text-lg font-semibold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>AI Project Validator</h3>
                  <p className={clsx("text-sm mb-6", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Share your project initiative and I&apos;ll help you structure it into a valid project format.
                  </p>
                  <div className={clsx(
                    "text-sm p-4 rounded-lg inline-block border-2 border-dashed max-w-md",
                    isDarkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"
                  )}>
                    💡 Example: &quot;I want to create a mobile app that helps users find and book local fitness classes for our company FitConnect&quot;
                  </div>
                </div>
              )}
              
              {/* Render chat messages */}
              {chatMessages.map((message) => (
                <div key={message.id} className="space-y-2">
                  {/* User Message */}
                  {message.type === 'user' && (
                    <div className="flex justify-end">
                      <div className={clsx(
                        "max-w-xs md:max-w-md px-4 py-2 rounded-lg text-sm",
                        "bg-blue-600 text-white"
                      )}>
                        {message.content}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Messages */}
                  {(message.type === 'ai' || message.type === 'welcome' || message.type === 'validation' || message.type === 'analysis') && (
                    <div className="flex justify-start">
                      <div className="flex space-x-2 max-w-full">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className={clsx(
                            "px-4 py-2 rounded-lg text-sm relative",
                            isDarkMode ? "bg-gray-700 text-gray-100" : "bg-gray-100 text-gray-800"
                          )}>
                            {message.fallbackMode && (
                              <div className={clsx(
                                "absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-medium",
                                message.fallbackMode === 'quick' 
                                  ? "bg-amber-500 text-white" 
                                  : "bg-red-500 text-white"
                              )}>
                                {message.fallbackMode === 'quick' ? '⚡ Quick Mode' : '🔧 Fallback'}
                              </div>
                            )}
                            {message.content}
                            
                            {/* Analysis Details */}
                            {message.type === 'analysis' && message.analysisDetails && (
                              <div className={clsx(
                                "mt-3 p-3 rounded-md border-l-4 text-xs",
                                isDarkMode 
                                  ? "bg-blue-900/20 border-blue-400 text-blue-200" 
                                  : "bg-blue-50 border-blue-400 text-blue-700"
                              )}>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="font-medium">Input:</span> {message.analysisDetails.inputLength} characters
                                  </div>
                                  <div>
                                    <span className="font-medium">Model:</span> {message.analysisDetails.model}
                                  </div>
                                  <div>
                                    <span className="font-medium">Context:</span> {message.analysisDetails.context}
                                  </div>
                                  <div>
                                    <span className="font-medium">Expected Time:</span> {message.analysisDetails.expectedTime}
                                  </div>
                                </div>
                                {message.status === 'in_progress' && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs">Processing...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {message.validation && (
                            <ProjectValidationMessage 
                              validation={message.validation} 
                              isDarkMode={isDarkMode} 
                              companyInfo={validationState.conversationState?.companyInfo}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* System Messages */}
                  {message.type === 'system' && (
                    <div className="flex justify-center">
                      <div className={clsx(
                        "px-3 py-1 rounded-full text-xs",
                        message.status === 'error' 
                          ? "bg-red-100 text-red-700" 
                          : isDarkMode 
                            ? "bg-gray-700 text-gray-300" 
                            : "bg-gray-200 text-gray-600"
                      )}>
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show thinking steps when AI is processing */}
              {validationState.isLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-2 max-w-full">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className={clsx(
                        "px-4 py-3 rounded-lg text-sm",
                        isDarkMode ? "bg-gray-700 text-gray-100" : "bg-gray-100 text-gray-800"
                      )}>
                        {currentThinking ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-blue-600">Processing...</span>
                              <span className="text-xs opacity-60">
                                Step {currentThinking.step} of {currentThinking.total}
                              </span>
                            </div>
                            <div className="text-sm opacity-90 whitespace-pre-line">
                              {currentThinking.content}
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-1.5 mt-2">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(currentThinking.step / currentThinking.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span>Processing your initiative...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat Input */}
            <div className={clsx(
              "p-4 border-t",
              isDarkMode ? "border-gray-700" : "border-gray-200"
            )}>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Describe your project initiative or ask questions..."
                  className={clsx(
                    "flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "border-gray-300 bg-white"
                  )}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  disabled={validationState.isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || validationState.isLoading}
                  className={clsx(
                    "px-6 py-3 rounded-xl font-medium transition-all text-sm",
                    !currentMessage.trim() || validationState.isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {validationState.isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </div>
                  )}
                </button>
              </div>
              
              {/* Status indicator */}
              {validationState.conversationState && (
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <span className={clsx(isDarkMode ? "text-gray-400" : "text-gray-600")}>
                      Validation attempts: {validationState.conversationState.validationAttempts}
                    </span>
                    {validationState.hasValidProject && (
                      <span className="text-green-600 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Project validated</span>
                      </span>
                    )}
                  </div>
                  <div className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Powered by LangChain + OpenAI
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Debug Panel */}
          {showDebugPanel && (
            <div className={clsx(
              "w-96 rounded-xl shadow-lg border flex flex-col",
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            )}>
              {/* Debug Header */}
              <div className={clsx(
                "p-4 border-b",
                isDarkMode ? "border-gray-700" : "border-gray-200"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className={clsx("font-semibold text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                    🔧 Debug Log
                  </h3>
                  <button
                    onClick={() => setDebugLogs([])}
                    className={clsx(
                      "p-1 rounded transition-colors text-xs",
                      isDarkMode
                        ? "hover:bg-gray-700 text-gray-400"
                        : "hover:bg-gray-100 text-gray-600"
                    )}
                    title="Clear logs"
                  >
                    Clear
                  </button>
                </div>
                <p className={clsx("text-xs mt-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  AI reasoning steps and API calls
                </p>
              </div>

              {/* Fallback Indicators */}
              {debugLogs.some(log => ['ai_parse_failure', 'ai_missing_score', 'api_error_fallback'].includes(log.type)) && (
                <div className="px-4 py-2 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-red-600 dark:text-red-400 text-sm font-semibold">⚠️ AI Fallback Active</span>
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                    {debugLogs.find(log => log.type === 'ai_parse_failure') && (
                      <div>• AI Response Parsing Failed → Using default 50% qualification score</div>
                    )}
                    {debugLogs.find(log => log.type === 'ai_missing_score') && (
                      <div>• AI Missing Score Field → Defaulted to 50% qualification score</div>
                    )}
                    {debugLogs.find(log => log.type === 'api_error_fallback') && (
                      <div>• OpenAI API Error → Using static validation with 30% score</div>
                    )}
                  </div>
                </div>
              )}

              {/* Debug Logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-full">
                {debugLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className={clsx("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                      No debug logs yet.
                      <br />
                      Send a message to see AI reasoning.
                    </div>
                  </div>
                ) : (
                  debugLogs.map((log) => (
                    <div
                      key={log.id}
                      className={clsx(
                        "rounded-lg p-3 border-l-4 text-xs",
                        log.type === 'api_call' && "border-blue-400 bg-blue-50 dark:bg-blue-900/20",
                        log.type === 'thinking' && "border-purple-400 bg-purple-50 dark:bg-purple-900/20",
                        log.type === 'qualification' && "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
                        log.type === 'validation' && "border-green-400 bg-green-50 dark:bg-green-900/20",
                        log.type === 'company_search' && "border-orange-400 bg-orange-50 dark:bg-orange-900/20",
                        log.type === 'response' && "border-gray-400 bg-gray-50 dark:bg-gray-900/20",
                        log.type === 'ai_success' && "border-green-500 bg-green-100 dark:bg-green-800/30",
                        log.type === 'fallback_mode' && "border-amber-500 bg-amber-100 dark:bg-amber-800/30",
                        log.type === 'error_fallback' && "border-red-500 bg-red-100 dark:bg-red-800/30",
                        log.type === 'ai_parse_failure' && "border-red-400 bg-red-50 dark:bg-red-900/20",
                        log.type === 'ai_missing_score' && "border-orange-500 bg-orange-100 dark:bg-orange-800/30",
                        log.type === 'api_error_fallback' && "border-red-600 bg-red-200 dark:bg-red-700/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{log.title}</span>
                        <div className="flex items-center space-x-2">
                          {log.duration && (
                            <span className={clsx("text-xs opacity-60")}>
                              {log.duration}ms
                            </span>
                          )}
                          <span className={clsx("text-xs opacity-60")}>
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className={clsx("text-xs", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                        {typeof log.details === 'object' ? (
                          <div className="space-y-1">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key} className="flex">
                                <span className={clsx(
                                  "font-medium capitalize min-w-0 flex-shrink-0 mr-2",
                                  log.type === 'fallback_mode' && "text-amber-700 dark:text-amber-300",
                                  log.type === 'error_fallback' && "text-red-700 dark:text-red-300",
                                  log.type === 'ai_parse_failure' && "text-red-700 dark:text-red-300",
                                  log.type === 'ai_missing_score' && "text-orange-700 dark:text-orange-300",
                                  log.type === 'api_error_fallback' && "text-red-800 dark:text-red-200"
                                )}>
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                </span>
                                <span className={clsx(
                                  "break-words flex-1",
                                  log.type === 'fallback_mode' && key === 'mode' && "font-semibold text-amber-800 dark:text-amber-200",
                                  log.type === 'error_fallback' && key === 'mode' && "font-semibold text-red-800 dark:text-red-200",
                                  log.type === 'ai_parse_failure' && (key === 'reason' || key === 'fallbackAction') && "font-semibold text-red-800 dark:text-red-200",
                                  log.type === 'ai_missing_score' && (key === 'fallbackValue' || key === 'impact') && "font-semibold text-orange-800 dark:text-orange-200",
                                  log.type === 'api_error_fallback' && (key === 'reason' || key === 'fallbackAction') && "font-semibold text-red-900 dark:text-red-100"
                                )}>
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{log.details}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}