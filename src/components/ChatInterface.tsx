"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Lightbulb, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { aiService, AIAnalysisProgress } from "@/lib/services/aiService";
import { aiAgent, AIAgentState } from "@/lib/services/aiAgentService";
import { AIAgentDisplay } from "./AIAgentDisplay";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
  analysisProgress?: AIAnalysisProgress;
  type?: "message" | "analysis_progress" | "analysis_complete";
}

interface ChatInterfaceProps {
  onIdeaSubmit?: (idea: string) => void;
  onAnalysisComplete?: (results: AIAnalysisProgress) => void;
  className?: string;
}

export function ChatInterface({ onIdeaSubmit, onAnalysisComplete, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "I'm your AI Planning Assistant! Describe your business idea and I'll help you analyze it through multiple stages: vision refinement, task decomposition, budget estimation, timeline planning, resource allocation, technical requirements, security considerations, and risk assessment.",
      sender: "assistant",
      timestamp: new Date(),
      type: "message"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysisProgress | null>(null);
  const [agentState, setAgentState] = useState<AIAgentState>(aiAgent.getState());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to AI Agent state changes
  useEffect(() => {
    const unsubscribe = aiAgent.subscribe(setAgentState);
    return unsubscribe;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isAnalyzing) return;

    const idea = inputValue.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      content: idea,
      sender: "user",
      timestamp: new Date(),
      type: "message"
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsAnalyzing(true);

    // Add initial analysis message
    const initialMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: `Perfect! I'll analyze "${idea}" through multiple stages to create a comprehensive business plan. This will take a moment...`,
      sender: "assistant",
      timestamp: new Date(),
      type: "message"
    };

    setMessages(prev => [...prev, initialMessage]);

    try {
      // Start AI Agent analysis
      await aiAgent.startAnalysis(idea);
      
      // Monitor agent progress and update dashboard when complete
      const checkAgentProgress = () => {
        const state = aiAgent.getState();
        
        if (!state.isActive && state.fieldProgress && Object.keys(state.fieldProgress).length > 0) {
          // Agent completed analysis - extract results for dashboard
          const results = {
            capex: state.fieldProgress.capex?.value || 0,
            opex: state.fieldProgress.opex?.value || 0,
            timeline: state.fieldProgress.timeline?.value || 0,
            savings: 0 // Calculate based on ROI if available
          };

          // Create a compatible analysis result
          const compatibleResult: AIAnalysisProgress = {
            currentStage: 'complete',
            completedStages: Object.keys(state.fieldProgress),
            totalStages: Object.keys(state.fieldProgress).length,
            progress: 100,
            results: {
              budget: {
                stage: 'budget',
                data: {
                  capex: { total: results.capex },
                  opex: { monthly: results.opex },
                  total_investment: results.capex + (results.opex * 12)
                },
                confidence: 0.85,
                processingTime: 1000
              },
              timeline: {
                stage: 'timeline',
                data: {
                  total_duration_weeks: results.timeline
                },
                confidence: 0.85,
                processingTime: 1000
              }
            },
            isComplete: true
          };

          // Notify parent component
          if (onAnalysisComplete) {
            onAnalysisComplete(compatibleResult);
          }

          // Call the original idea submit handler for backward compatibility
          if (onIdeaSubmit) {
            onIdeaSubmit(idea);
          }

          clearInterval(progressInterval);
        }
      };

      const progressInterval = setInterval(checkAgentProgress, 1000);

      // Cleanup interval after 60 seconds
      setTimeout(() => clearInterval(progressInterval), 60000);

    } catch (error) {
      console.error('Analysis failed:', error);
      
      const errorMessage: Message = {
        id: "error-" + Date.now(),
        content: "I apologize, but there was an error analyzing your idea. Please try again or contact support if the issue persists.",
        sender: "assistant",
        timestamp: new Date(),
        type: "message"
      };

      setMessages(prev => {
        const filtered = prev.filter(m => m.type !== "analysis_progress");
        return [...filtered, errorMessage];
      });
    } finally {
      setIsAnalyzing(false);
      setCurrentAnalysis(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={clsx("space-y-4", className)}>
      {/* AI Agent Display */}
      {(agentState.isActive || agentState.todoList.length > 0) && (
        <AIAgentDisplay />
      )}

      {/* Chat Interface */}
      <div className="bg-white rounded-xl border-2 border-blue-200 flex flex-col h-96">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">9</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">PROMPT</h3>
              <p className="text-sm text-gray-500">AI Planning Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              agentState.isActive ? "bg-green-500 animate-pulse" : "bg-blue-500"
            )}></div>
            <span className="text-xs text-gray-500">
              {agentState.isActive ? "Analyzing" : "Ready"}
            </span>
          </div>
        </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={clsx(
                "flex items-start space-x-3",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.sender === "assistant" && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              
              <div className={clsx(
                "max-w-xs lg:max-w-md rounded-lg",
                message.sender === "user"
                  ? "bg-blue-600 text-white px-4 py-2"
                  : message.type === "analysis_progress"
                  ? "bg-blue-50 border border-blue-200 p-4"
                  : "bg-gray-100 text-gray-900 px-4 py-2"
              )}>
                {message.type === "analysis_progress" && message.analysisProgress ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {aiService.getStageDescription(message.analysisProgress.currentStage)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Progress: {message.analysisProgress.progress.toFixed(0)}%</span>
                        <span>{message.analysisProgress.completedStages.length}/{message.analysisProgress.totalStages} stages</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-blue-600 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${message.analysisProgress.progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1 mt-2">
                        {['vision', 'tasks', 'budget', 'timeline', 'resources', 'tech', 'security', 'risks'].map((stage, index) => (
                          <div
                            key={stage}
                            className={clsx(
                              "flex items-center justify-center w-6 h-6 rounded text-xs",
                              message.analysisProgress!.completedStages.includes(stage)
                                ? "bg-green-100 text-green-800"
                                : message.analysisProgress!.currentStage === stage
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-400"
                            )}
                          >
                            {message.analysisProgress!.completedStages.includes(stage) ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : message.analysisProgress!.currentStage === stage ? (
                              <Clock className="w-3 h-3" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={clsx(
                      "text-xs mt-1",
                      message.sender === "user" ? "text-blue-200" : "text-gray-500"
                    )}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </>
                )}
              </div>

              {message.sender === "user" && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>


        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your business idea..."
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isAnalyzing}
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <Lightbulb className="w-4 h-4" />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isAnalyzing}
            className={clsx(
              "flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-200",
              inputValue.trim() && !isAnalyzing
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2 flex items-center">
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border rounded">Enter</kbd>
          <span className="ml-1">to send, </span>
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border rounded ml-1">Shift+Enter</kbd>
          <span className="ml-1">for new line</span>
        </p>
      </form>
      </div>
    </div>
  );
}
