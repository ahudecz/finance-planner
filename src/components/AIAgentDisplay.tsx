"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Target, 
  Calculator,
  TrendingUp,
  Shield,
  Users,
  Code,
  ChevronDown,
  ChevronRight,
  Lightbulb
} from "lucide-react";
import { clsx } from "clsx";
import { aiAgent, AIAgentState, AITodoItem, ReasoningStep } from "@/lib/services/aiAgentService";

interface AIAgentDisplayProps {
  className?: string;
  isDarkMode?: boolean;
}

export function AIAgentDisplay({ className, isDarkMode = false }: AIAgentDisplayProps) {
  const [agentState, setAgentState] = useState<AIAgentState>(aiAgent.getState());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    thinking: true,
    todos: true,
    reasoning: false,
    calculations: false
  });

  useEffect(() => {
    const unsubscribe = aiAgent.subscribe(setAgentState);
    return unsubscribe;
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!agentState.isActive && (!agentState.todoList || agentState.todoList.length === 0)) {
    return null;
  }

  return (
    <div className={clsx(
      "rounded-xl border p-3 space-y-3 text-xs",
      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-blue-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-3 h-3 text-white" />
          </div>
          <div>
            <h3 className={clsx("font-semibold text-xs", isDarkMode ? "text-white" : "text-gray-900")}>AI Business Analyst</h3>
            <p className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              {agentState.isActive ? "Analyzing..." : "Analysis Complete"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <div className={clsx(
            "w-1.5 h-1.5 rounded-full",
            agentState.isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )}></div>
          <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
            {agentState.isActive ? "Active" : "Idle"}
          </span>
        </div>
      </div>

      {/* Current Thinking Process */}
      {agentState.currentThinking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx("rounded-lg p-3", isDarkMode ? "bg-blue-900" : "bg-blue-50")}
        >
          <button
            onClick={() => toggleSection('thinking')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-3 h-3 text-blue-600" />
              <span className={clsx("font-medium text-xs", isDarkMode ? "text-white" : "text-gray-900")}>Current Thinking</span>
            </div>
            {expandedSections.thinking ? 
              <ChevronDown className={clsx("w-3 h-3", isDarkMode ? "text-gray-400" : "text-gray-500")} /> : 
              <ChevronRight className={clsx("w-3 h-3", isDarkMode ? "text-gray-400" : "text-gray-500")} />
            }
          </button>
          
          <AnimatePresence>
            {expandedSections.thinking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                <div className={clsx("text-xs", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                  <div className="flex items-start space-x-2 mb-1">
                    <Brain className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">{agentState.currentThinking.currentThought}</span>
                  </div>
                  <p className={clsx("ml-5 text-xs", isDarkMode ? "text-gray-300" : "text-gray-600")}>{agentState.currentThinking.reasoning}</p>
                </div>

                {agentState.currentThinking.currentField && (
                  <div className={clsx(
                    "rounded-md p-2 border",
                    isDarkMode ? "bg-gray-700 border-blue-700" : "bg-white border-blue-200"
                  )}>
                    <div className="flex items-center space-x-1 mb-1">
                      <Target className="w-2 h-2 text-blue-600" />
                      <span className={clsx("text-xs font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>Currently Working On</span>
                    </div>
                    <span className={clsx("text-xs capitalize", isDarkMode ? "text-white" : "text-gray-900")}>
                      {agentState.currentThinking.currentField.replace('_', ' ')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className={clsx(isDarkMode ? "text-gray-400" : "text-gray-500")}>
                    Confidence: {Math.round(agentState.currentThinking.confidence * 100)}%
                  </span>
                  <div className="flex items-center space-x-1">
                    <div className={clsx("w-16 rounded-full h-1.5", isDarkMode ? "bg-gray-700" : "bg-gray-200")}>
                      <motion.div
                        className="bg-blue-600 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${agentState.currentThinking.confidence * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>

                {agentState.currentThinking.nextSteps && agentState.currentThinking.nextSteps.length > 0 && (
                  <div className="text-xs">
                    <span className={clsx("font-medium", isDarkMode ? "text-gray-300" : "text-gray-600")}>Next Steps:</span>
                    <ul className="mt-1 space-y-0.5">
                      {agentState.currentThinking.nextSteps.map((step, index) => (
                        <li key={index} className={clsx("flex items-start space-x-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                          <span className="text-blue-600">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {agentState.currentThinking.uncertainties && agentState.currentThinking.uncertainties.length > 0 && (
                  <div className="text-xs">
                    <span className="text-orange-600 font-medium">Uncertainties:</span>
                    <ul className="mt-1 space-y-0.5">
                      {agentState.currentThinking.uncertainties.map((uncertainty, index) => (
                        <li key={index} className="flex items-start space-x-1 text-orange-600">
                          <AlertTriangle className="w-2 h-2 mt-0.5 flex-shrink-0" />
                          <span>{uncertainty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Todo List */}
      {agentState.todoList && agentState.todoList.length > 0 && (
        <div className={clsx("rounded-lg p-3", isDarkMode ? "bg-gray-700" : "bg-gray-50")}>
          <button
            onClick={() => toggleSection('todos')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className={clsx("font-medium text-xs", isDarkMode ? "text-white" : "text-gray-900")}>Analysis Tasks</span>
              <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                ({(agentState.todoList || []).filter(t => t.status === 'completed').length}/{(agentState.todoList || []).length})
              </span>
            </div>
            {expandedSections.todos ? 
              <ChevronDown className={clsx("w-3 h-3", isDarkMode ? "text-gray-400" : "text-gray-500")} /> : 
              <ChevronRight className={clsx("w-3 h-3", isDarkMode ? "text-gray-400" : "text-gray-500")} />
            }
          </button>

          <AnimatePresence>
            {expandedSections.todos && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {(agentState.todoList || []).map((todo) => (
                  <TodoItem key={todo.id} todo={todo} isDarkMode={isDarkMode} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Reasoning History */}
      {agentState.reasoningHistory && agentState.reasoningHistory.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-4">
          <button
            onClick={() => toggleSection('reasoning')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-900">Reasoning History</span>
              <span className="text-xs text-gray-500">
                ({(agentState.reasoningHistory || []).length} steps)
              </span>
            </div>
            {expandedSections.reasoning ? 
              <ChevronDown className="w-4 h-4 text-gray-500" /> : 
              <ChevronRight className="w-4 h-4 text-gray-500" />
            }
          </button>

          <AnimatePresence>
            {expandedSections.reasoning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {(agentState.reasoningHistory || []).map((step) => (
                  <ReasoningStepDisplay key={step.id} step={step} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Field Progress */}
      {agentState.fieldProgress && Object.keys(agentState.fieldProgress).length > 0 && (
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <Target className="w-4 h-4 text-green-600" />
            <span>Field Analysis Progress</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(agentState.fieldProgress || {}).map(([field, progress]) => (
              <FieldProgressDisplay key={field} field={field} progress={progress} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, isDarkMode = false }: { todo: AITodoItem; isDarkMode?: boolean }) {
  const [expandedOutcome, setExpandedOutcome] = useState(false);

  const getStatusIcon = (status: AITodoItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const hasOutcome = todo.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        "rounded-md border overflow-hidden",
        isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
      )}
    >
      <div className="flex items-start space-x-3 p-3">
        {getStatusIcon(todo.status)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={clsx(
              "text-sm font-medium",
              todo.status === 'completed' ? "text-gray-900" : "text-gray-900"
            )}>
              {todo.task}
            </span>
            <div className="flex items-center space-x-2">
              {todo.confidence && (
                <span className="text-xs text-gray-500">
                  {Math.round(todo.confidence * 100)}%
                </span>
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
          
          {todo.status === 'in_progress' && todo.reasoning && (
            <p className="text-xs text-gray-600 mt-1">{todo.reasoning}</p>
          )}
          
          {todo.status === 'in_progress' && todo.progress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className="bg-blue-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${todo.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
          
          {todo.startTime && todo.status !== 'pending' && todo.status !== 'completed' && (
            <div className="text-xs text-gray-400 mt-1">
              Started: {todo.startTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Outcome Section for Completed Tasks */}
      <AnimatePresence>
        {hasOutcome && expandedOutcome && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 bg-green-50 px-3 py-3"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-800">Task Outcome</span>
              </div>
              
              <div className="bg-white rounded-md p-2 border border-green-200">
                <span className="text-xs font-medium text-gray-700">Result:</span>
                <p className="text-xs text-gray-600 mt-1">
                  {todo.reasoning || "Task completed successfully"}
                </p>
              </div>
              
              <div className="flex justify-between items-center text-xs text-green-700">
                <span>
                  Completed: {todo.completedTime?.toLocaleTimeString() || "Recently"}
                </span>
                {todo.startTime && todo.completedTime && (
                  <span>
                    Duration: {Math.round((todo.completedTime.getTime() - todo.startTime.getTime()) / 1000)}s
                  </span>
                )}
              </div>
              
              {todo.confidence && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600">Final Confidence:</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <motion.div
                        className="bg-green-600 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${todo.confidence * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{Math.round(todo.confidence * 100)}%</span>
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

function ReasoningStepDisplay({ step }: { step: ReasoningStep }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-md border border-purple-200 p-3"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
          <span className="font-medium text-gray-900 text-sm">{step.step}</span>
          <span className="text-xs text-gray-500">
            {Math.round(step.confidence * 100)}% confidence
          </span>
        </div>
        {expanded ? 
          <ChevronDown className="w-4 h-4 text-gray-500" /> : 
          <ChevronRight className="w-4 h-4 text-gray-500" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2"
          >
            <p className="text-sm text-gray-700">{step.reasoning}</p>
            
            <div className="bg-purple-50 rounded-md p-2">
              <span className="text-xs font-medium text-purple-800">Decision:</span>
              <p className="text-xs text-purple-700 mt-1">{step.decision}</p>
            </div>

            {step.toolsConsidered && step.toolsConsidered.length > 0 && (
              <div className="text-xs">
                <span className="font-medium text-gray-600">Tools Used:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(step.toolsConsidered || []).map((tool, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {step.calculationSteps && Array.isArray(step.calculationSteps) && step.calculationSteps.length > 0 && (
              <div className="bg-blue-50 rounded-md p-2">
                <div className="flex items-center space-x-1 mb-2">
                  <Calculator className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Calculations:</span>
                </div>
                {(step.calculationSteps || []).map((calc, index) => (
                  <div key={index} className="text-xs space-y-1 mb-2 last:mb-0">
                    <div className="font-medium text-blue-900">{calc.description}</div>
                    <div className="text-blue-700 font-mono">{calc.formula}</div>
                    <div className="text-blue-600">{calc.explanation}</div>
                    <div className="text-blue-800 font-semibold">
                      Result: ${calc.result.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-gray-400">
              {step.timestamp.toLocaleTimeString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FieldProgressDisplay({ field, progress }: { field: string; progress: any }) {
  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'capex':
      case 'opex':
        return <Calculator className="w-3 h-3" />;
      case 'timeline':
        return <Clock className="w-3 h-3" />;
      case 'risks':
        return <Shield className="w-3 h-3" />;
      case 'resources':
        return <Users className="w-3 h-3" />;
      case 'tech':
        return <Code className="w-3 h-3" />;
      default:
        return <Target className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'analyzing':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-md border border-green-200 p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1">
          <div className={clsx("p-1 rounded", getStatusColor(progress.status))}>
            {getFieldIcon(field)}
          </div>
          <span className="text-sm font-medium text-gray-900 capitalize">
            {field.replace('_', ' ')}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {Math.round(progress.confidence * 100)}%
        </span>
      </div>
      
      <p className="text-xs text-gray-600">{progress.reasoning}</p>
      
      {progress.value !== undefined && (
        <div className="mt-1 text-xs font-medium text-green-700">
          {typeof progress.value === 'number' ? 
            (field.includes('capex') || field.includes('opex') ? 
              `$${progress.value.toLocaleString()}` : 
              field === 'timeline' ? 
                `${progress.value} weeks` : 
                progress.value
            ) : 
            String(progress.value)
          }
        </div>
      )}
    </div>
  );
}