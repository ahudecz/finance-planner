"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { AITodoItem } from "@/lib/services/aiAgentService";

interface AgentTodoListProps {
  todos: AITodoItem[];
  title?: string;
  className?: string;
}

export function AgentTodoList({ todos, title = "Analysis Progress", className }: AgentTodoListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const completedCount = todos.filter(todo => todo.status === 'completed').length;
  const inProgressCount = todos.filter(todo => todo.status === 'in_progress').length;
  const totalCount = todos.length;

  if (todos.length === 0) {
    return null;
  }

  return (
    <div className={clsx("bg-gray-50 rounded-lg border border-gray-200 p-3 text-sm", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2 text-left group"
      >
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>({completedCount}/{totalCount})</span>
            {inProgressCount > 0 && (
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                {inProgressCount} active
              </span>
            )}
          </div>
        </div>
        
        <div className="w-16 bg-gray-200 rounded-full h-1.5">
          <motion.div
            className="bg-blue-600 h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalCount) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </button>

      {/* Todo List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1"
          >
            {todos.map((todo, index) => (
              <TodoItem key={todo.id} todo={todo} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TodoItemProps {
  todo: AITodoItem;
  index: number;
}

function TodoItem({ todo, index }: TodoItemProps) {
  const getStatusIcon = (status: AITodoItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />;
      case 'blocked':
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AITodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-800 bg-green-50';
      case 'in_progress':
        return 'text-blue-800 bg-blue-50';
      case 'blocked':
        return 'text-red-800 bg-red-50';
      default:
        return 'text-gray-600 bg-white';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={clsx(
        "flex items-start space-x-2 p-2 rounded border transition-all",
        getStatusColor(todo.status)
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon(todo.status)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={clsx(
            "text-xs font-medium truncate",
            todo.status === 'completed' && "line-through"
          )}>
            {todo.task}
          </span>
          {todo.status === 'in_progress' && todo.progress > 0 && (
            <span className="text-xs text-blue-600 ml-2">
              {Math.round(todo.progress)}%
            </span>
          )}
        </div>
        
        {todo.reasoning && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {todo.reasoning}
          </p>
        )}
        
        {todo.status === 'in_progress' && todo.progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <motion.div
              className="bg-blue-600 h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${todo.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
        
        {todo.subTasks && todo.subTasks.length > 0 && (
          <div className="mt-1 ml-4 space-y-0.5">
            {todo.subTasks.slice(0, 2).map((subTask) => (
              <div key={subTask.id} className="flex items-center space-x-1 text-xs text-gray-500">
                {getStatusIcon(subTask.status)}
                <span className="truncate">{subTask.task}</span>
              </div>
            ))}
            {todo.subTasks.length > 2 && (
              <span className="text-xs text-gray-400 ml-4">
                +{todo.subTasks.length - 2} more...
              </span>
            )}
          </div>
        )}
        
        {(todo.startTime || todo.completedTime) && (
          <div className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
            {todo.startTime && (
              <span>Started: {todo.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
            {todo.completedTime && (
              <span>Completed: {todo.completedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}