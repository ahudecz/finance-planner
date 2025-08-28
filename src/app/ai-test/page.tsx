"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Lightbulb,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { clsx } from "clsx";
import { aiAgent, AIAgentState } from "@/lib/services/aiAgentService";
import { AIAgentDisplay } from "@/components/AIAgentDisplay";
import { AgentTodoList } from "@/components/AgentTodoList";

interface ConfirmationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  needsConfirmation: boolean;
  result?: any;
}

export default function AITestPage() {
  const [agentState, setAgentState] = useState<AIAgentState>(aiAgent.getState());
  const [businessIdea, setBusinessIdea] = useState("");
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<ConfirmationStep[]>([]);
  const [currentStepData, setCurrentStepData] = useState<ConfirmationStep | null>(null);
  
  const confirmationSteps: ConfirmationStep[] = [
    {
      id: 'plan',
      title: 'Analysis Plan Created',
      description: 'The AI has created an analysis plan based on your business idea. Review the planned approach.',
      completed: false,
      needsConfirmation: true
    },
    {
      id: 'concept',
      title: 'Business Concept Analysis',
      description: 'The AI has analyzed your business concept and classified it. Review the understanding.',
      completed: false,
      needsConfirmation: true
    },
    {
      id: 'market',
      title: 'Market Research Complete',
      description: 'Market size and competition analysis is done. Review the market insights.',
      completed: false,
      needsConfirmation: true
    },
    {
      id: 'technical',
      title: 'Technical Requirements Analysis',
      description: 'Technical architecture and platform requirements have been determined.',
      completed: false,
      needsConfirmation: true
    },
    {
      id: 'budget',
      title: 'Budget Calculations',
      description: 'CAPEX and OPEX estimates have been calculated based on requirements.',
      completed: false,
      needsConfirmation: true
    },
    {
      id: 'timeline',
      title: 'Timeline Estimation',
      description: 'Development timeline and milestones have been estimated.',
      completed: false,
      needsConfirmation: true
    },
    {
      id: 'risks',
      title: 'Risk Assessment',
      description: 'Potential risks and mitigation strategies have been identified.',
      completed: false,
      needsConfirmation: true
    },
    {
      id: 'complete',
      title: 'Analysis Complete',
      description: 'Full business analysis is complete and ready for review.',
      completed: false,
      needsConfirmation: false
    }
  ];

  useEffect(() => {
    const unsubscribe = aiAgent.subscribe(setAgentState);
    return unsubscribe;
  }, []);

  // Monitor agent state for step completion and confirmation requests
  useEffect(() => {
    // Handle waiting for confirmation
    if (agentState.waitingForConfirmation && !waitingForConfirmation) {
      const currentTodo = agentState.todoList.find(todo => todo.status === 'in_progress');
      if (currentTodo) {
        const stepMapping: Record<string, string> = {
          'clarify-project-type': 'plan',
          'gather-context': 'concept',
          'get-approval': 'concept',
          'understand-concept': 'concept',
          'market-research': 'market', 
          'technical-analysis': 'technical',
          'budget-calculation': 'budget',
          'timeline-estimation': 'timeline',
          'risk-assessment': 'risks'
        };
        
        const stepId = stepMapping[currentTodo.id];
        if (stepId) {
          handleStepComplete(stepId);
        }
      }
    }
    
    // Handle final completion
    if (!agentState.isActive && !agentState.waitingForConfirmation && agentState.todoList.length > 0) {
      const completedTodos = agentState.todoList.filter(todo => todo.status === 'completed');
      if (completedTodos.length === agentState.todoList.length) {
        handleStepComplete('complete');
      }
    }
  }, [agentState, waitingForConfirmation]);

  const handleStepComplete = (stepId: string) => {
    const step = confirmationSteps.find(s => s.id === stepId);
    if (!step) return;
    
    setCurrentStepData({ ...step, completed: true });
    
    if (step.needsConfirmation) {
      setCurrentStep(stepId);
      setWaitingForConfirmation(true);
    } else {
      // Auto-proceed for steps that don't need confirmation
      setCompletedSteps(prev => [...prev, { ...step, completed: true }]);
    }
  };

  const handleConfirmStep = () => {
    if (currentStepData) {
      setCompletedSteps(prev => [...prev, currentStepData]);
    }
    setWaitingForConfirmation(false);
    setCurrentStep(null);
    setCurrentStepData(null);
    
    // Tell the AI agent to continue
    aiAgent.confirmStep(true);
  };

  const handleStartAnalysis = async () => {
    if (!businessIdea.trim()) return;
    
    // Reset state
    setCompletedSteps([]);
    setCurrentStep(null);
    setWaitingForConfirmation(false);
    
    // Start with plan confirmation
    setCurrentStepData({
      id: 'plan',
      title: 'Analysis Plan Created',
      description: `The AI will analyze "${businessIdea}" through systematic steps: business concept understanding, market research, technical analysis, budget calculation, timeline estimation, and risk assessment.`,
      completed: false,
      needsConfirmation: true
    });
    setCurrentStep('plan');
    setWaitingForConfirmation(true);
  };

  const handleProceedWithAnalysis = async () => {
    setWaitingForConfirmation(false);
    setCurrentStep(null);
    
    // Add plan to completed steps
    if (currentStepData) {
      setCompletedSteps(prev => [...prev, { ...currentStepData, completed: true }]);
    }
    
    // Start the actual AI analysis
    await aiAgent.startAnalysis(businessIdea);
  };

  const handleReset = () => {
    // Reset local state
    setBusinessIdea("");
    setCompletedSteps([]);
    setCurrentStep(null);
    setWaitingForConfirmation(false);
    setCurrentStepData(null);
    
    // Reset AI agent state
    aiAgent.reset();
  };

  const getStepStatus = (stepId: string) => {
    if (completedSteps.find(s => s.id === stepId)) return 'completed';
    if (currentStep === stepId) return 'current';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Agent Test Center</h1>
              <p className="text-gray-600">Test the AI business analyst with step-by-step confirmations</p>
            </div>
          </div>
        </div>

        {/* Input Section and Confirmation Dialog - Side by Side */}
        <div className="flex gap-4 h-1/3">
          {/* Business Idea Input - 40% width to match Analysis Progress below */}
          <div className="w-2/5 bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col">
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lightbulb className="w-4 h-4 inline mr-2" />
                  Business Idea to Analyze
                </label>
                <textarea
                  value={businessIdea}
                  onChange={(e) => setBusinessIdea(e.target.value)}
                  placeholder="e.g., A mobile app that helps users find and book local fitness classes with real-time availability"
                  className="w-full h-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-32"
                  disabled={agentState.isActive || waitingForConfirmation}
                />
              </div>
              
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleStartAnalysis}
                  disabled={!businessIdea.trim() || agentState.isActive || waitingForConfirmation}
                  className={clsx(
                    "flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all",
                    businessIdea.trim() && !agentState.isActive && !waitingForConfirmation
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <Play className="w-4 h-4" />
                  <span>Start AI Analysis</span>
                </button>
                
                <button
                  onClick={handleReset}
                  disabled={agentState.isActive}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Business Concept Analysis - 60% width to match AI Agent below */}
          <div className="w-3/5 h-full">
            <AnimatePresence>
              {waitingForConfirmation && currentStepData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-xl shadow-xl border-2 border-blue-200 p-6 h-full flex flex-col"
                >
                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">{currentStepData.title}</h3>
                        <p className="text-gray-600 mt-1 text-sm">{currentStepData.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {currentStepData.id === 'plan' && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm">Analysis Plan:</h4>
                          <ul className="space-y-1 text-xs text-gray-700">
                            <li>• Business concept classification</li>
                            <li>• Market research & competition</li>
                            <li>• Technical requirements</li>
                            <li>• CAPEX/OPEX calculations</li>
                            <li>• Timeline & milestones</li>
                            <li>• Risk assessment</li>
                          </ul>
                        </div>
                      )}
                      
                      {/* Show step results */}
                      {agentState.currentStepResult && currentStepData.id !== 'plan' && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2 text-sm">Step Results:</h4>
                          <div className="text-xs text-blue-800">
                            <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                              {JSON.stringify(agentState.currentStepResult, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {/* Show current reasoning */}
                      {agentState.currentThinking && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <h4 className="font-medium text-purple-900 mb-2 text-sm">AI Reasoning:</h4>
                          <div className="text-xs text-purple-800">
                            <p><strong>Thought:</strong> {agentState.currentThinking.currentThought}</p>
                            <p><strong>Reasoning:</strong> {agentState.currentThinking.reasoning}</p>
                            <p><strong>Confidence:</strong> {Math.round(agentState.currentThinking.confidence * 100)}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                      <button
                        onClick={handleReset}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={currentStepData.id === 'plan' ? handleProceedWithAnalysis : handleConfirmStep}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all text-sm"
                      >
                        <span>{currentStepData.id === 'plan' ? 'Start Analysis' : 'Continue'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Analysis Progress and AI Agent Display - Side by Side */}
        {(completedSteps.length > 0 || agentState.isActive || waitingForConfirmation) && (
          <div className="flex gap-4">
            {/* Progress Steps - 40% width */}
            <div className="w-2/5 space-y-4">
              <AgentTodoList 
                todos={agentState.todoList} 
                title="Business Idea Analysis" 
                className="bg-white shadow-lg border-gray-200"
              />
              <AnalysisProgressDropdown 
                confirmationSteps={confirmationSteps}
                completedSteps={completedSteps}
                getStepStatus={getStepStatus}
              />
            </div>

            {/* AI Agent Display - 60% width */}
            {(agentState.isActive || agentState.todoList.length > 0) && (
              <div className="w-3/5">
                <AIAgentDisplay />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProgressStepItemProps {
  step: ConfirmationStep;
  status: 'completed' | 'current' | 'pending';
  index: number;
  completedStep?: ConfirmationStep;
}

function ProgressStepItem({ step, status, index, completedStep }: ProgressStepItemProps) {
  const [expandedOutcome, setExpandedOutcome] = useState(false);
  const hasOutcome = status === 'completed' && completedStep;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={clsx(
        "rounded-lg border transition-all overflow-hidden",
        status === 'completed' && "bg-green-50 border-green-200",
        status === 'current' && "bg-blue-50 border-blue-200",
        status === 'pending' && "bg-gray-50 border-gray-200"
      )}
    >
      <div className="flex items-center space-x-3 p-3">
        <div className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center",
          status === 'completed' && "bg-green-100",
          status === 'current' && "bg-blue-100",
          status === 'pending' && "bg-gray-100"
        )}>
          {status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : status === 'current' ? (
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
          ) : (
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className={clsx(
            "font-medium",
            status === 'completed' && "text-green-900",
            status === 'current' && "text-blue-900",
            status === 'pending' && "text-gray-600"
          )}>
            {step.title}
          </h4>
          <p className={clsx(
            "text-sm",
            status === 'completed' && "text-green-700",
            status === 'current' && "text-blue-700",
            status === 'pending' && "text-gray-500"
          )}>
            {step.description}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {status === 'current' && (
            <div className="text-blue-600 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          {hasOutcome && (
            <button
              onClick={() => setExpandedOutcome(!expandedOutcome)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expandedOutcome ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </button>
          )}
        </div>
      </div>

      {/* Expanded Outcome Section for Completed Steps */}
      <AnimatePresence>
        {hasOutcome && expandedOutcome && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-green-100 bg-green-100 px-3 py-3"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-800">Step Outcome</span>
              </div>
              
              <div className="bg-white rounded-md p-2 border border-green-200">
                <span className="text-xs font-medium text-gray-700">Result:</span>
                <p className="text-xs text-gray-600 mt-1">
                  Step completed successfully - {step.description}
                </p>
              </div>
              
              <div className="flex justify-between items-center text-xs text-green-700">
                <span>Completed: Recently</span>
                <span>Status: ✅ Confirmed</span>
              </div>
              
              {completedStep?.result && (
                <div className="bg-white rounded-md p-2 border border-green-200">
                  <span className="text-xs font-medium text-gray-700">Analysis Result:</span>
                  <div className="text-xs text-gray-600 mt-1">
                    <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-2 rounded border">
                      {JSON.stringify(completedStep.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface AnalysisProgressDropdownProps {
  confirmationSteps: ConfirmationStep[];
  completedSteps: ConfirmationStep[];
  getStepStatus: (stepId: string) => 'completed' | 'current' | 'pending';
}

function AnalysisProgressDropdown({ confirmationSteps, completedSteps, getStepStatus }: AnalysisProgressDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Find current or most recent step
  const currentStepIndex = confirmationSteps.findIndex(step => getStepStatus(step.id) === 'current');
  const currentStep = currentStepIndex >= 0 
    ? confirmationSteps[currentStepIndex]
    : confirmationSteps.find(step => getStepStatus(step.id) === 'completed') || confirmationSteps[0];

  const completedCount = confirmationSteps.filter(step => getStepStatus(step.id) === 'completed').length;
  const totalSteps = confirmationSteps.length;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header with current step */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 text-left"
      >
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span className="text-lg font-semibold text-gray-900">Analysis Progress</span>
          <span className="text-sm text-gray-500">({completedCount}/{totalSteps})</span>
        </div>
        {isExpanded ? 
          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
          <ChevronRight className="w-5 h-5 text-gray-400" />
        }
      </button>

      {/* Current Step Always Visible */}
      {currentStep && (
        <div className="mb-3">
          <ProgressStepItem
            step={currentStep}
            status={getStepStatus(currentStep.id)}
            index={0}
            completedStep={completedSteps.find(s => s.id === currentStep.id)}
          />
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalSteps) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Progress</span>
          <span>{Math.round((completedCount / totalSteps) * 100)}%</span>
        </div>
      </div>

      {/* Expandable All Steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 border-t pt-4"
          >
            <h4 className="font-medium text-gray-700 text-sm">All Steps:</h4>
            {confirmationSteps.map((step, index) => {
              if (step.id === currentStep?.id) return null; // Skip current step since it's shown above
              
              const status = getStepStatus(step.id);
              const completedStep = completedSteps.find(s => s.id === step.id);
              return (
                <ProgressStepItem
                  key={step.id}
                  step={step}
                  status={status}
                  index={index}
                  completedStep={completedStep}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}