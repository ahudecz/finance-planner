"use client";

import { motion } from "framer-motion";
import { Bot, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface AgentStage {
  id: string;
  label: string;
  icon: string;
  completed: boolean;
  current: boolean;
}

interface AgentStatusCardProps {
  isActive: boolean;
  currentStage?: string;
  progress?: number;
  stages?: AgentStage[];
  className?: string;
}

const defaultStages: AgentStage[] = [
  { id: 'vision', label: 'Vision Refinement', icon: '🎯', completed: false, current: false },
  { id: 'tasks', label: 'Task Breakdown', icon: '📋', completed: false, current: false },
  { id: 'budget', label: 'Budget Analysis', icon: '💰', completed: false, current: false },
  { id: 'timeline', label: 'Timeline Planning', icon: '📅', completed: false, current: false },
  { id: 'resources', label: 'Resource Allocation', icon: '👥', completed: false, current: false },
  { id: 'technical', label: 'Technical Requirements', icon: '⚙️', completed: false, current: false },
  { id: 'security', label: 'Security Assessment', icon: '🔒', completed: false, current: false },
  { id: 'risks', label: 'Risk Analysis', icon: '⚠️', completed: false, current: false }
];

export function AgentStatusCard({ 
  isActive, 
  currentStage = 'vision',
  progress = 0,
  stages = defaultStages,
  className 
}: AgentStatusCardProps) {
  
  const currentStageData = stages.find(stage => stage.id === currentStage) || stages[0];
  const completedCount = stages.filter(stage => stage.completed).length;
  
  const statusIcon = isActive ? (
    <Loader2 className="w-3 h-3 text-white animate-spin" />
  ) : completedCount === stages.length ? (
    <CheckCircle className="w-3 h-3 text-white" />
  ) : (
    <Clock className="w-3 h-3 text-white" />
  );

  const statusText = isActive ? "Analyzing..." : 
                    completedCount === stages.length ? "Complete" : 
                    completedCount > 0 ? `${completedCount}/${stages.length} Done` : "Ready";

  const gradientClass = isActive ? 
    "from-blue-500 via-purple-500 to-indigo-600" :
    completedCount === stages.length ? 
    "from-green-500 via-emerald-500 to-teal-600" :
    "from-gray-500 via-gray-600 to-gray-700";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "group relative overflow-hidden rounded-md bg-white/80 backdrop-blur-xl border border-white/20 p-2 transition-all duration-200",
        className
      )}
      style={{
        boxShadow: 'var(--shadow-md)'
      }}
    >
      {/* Animated Background */}
      <div className={clsx(
        "absolute inset-0 bg-gradient-to-br opacity-[0.05] transition-opacity duration-300",
        gradientClass,
        isActive && "animate-pulse"
      )} />

      {/* Status Icon */}
      <div className="relative mb-1">
        <div className={clsx(
          "w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center shadow-sm transition-transform duration-200",
          gradientClass,
          isActive && "animate-pulse"
        )}>
          {statusIcon}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 tracking-wide uppercase leading-tight">
          AI Agent
        </h3>
        
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-0 leading-tight">
          {statusText}
        </p>
        
        {isActive && currentStageData && (
          <div className="mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              <span className="mr-1">{currentStageData.icon}</span>
              {currentStageData.label}
            </p>
            
            {/* Progress Bar */}
            {progress > 0 && (
              <div className="mt-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <motion.div 
                    className={clsx("h-1 rounded-full bg-gradient-to-r", gradientClass)}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{progress}% complete</p>
              </div>
            )}
          </div>
        )}

        {!isActive && completedCount > 0 && completedCount < stages.length && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
            Next: {stages.find(stage => !stage.completed)?.label || 'All done'}
          </p>
        )}

        {!isActive && completedCount === stages.length && (
          <p className="text-xs text-green-600 dark:text-green-400 leading-tight mt-0.5">
            ✨ Analysis complete
          </p>
        )}
      </div>

      {/* Pulse Effect for Active State */}
      {isActive && (
        <div className="absolute inset-0 opacity-20 animate-ping">
          <div className={clsx("absolute inset-0 rounded-md bg-gradient-to-r", gradientClass)} />
        </div>
      )}
    </motion.div>
  );
}