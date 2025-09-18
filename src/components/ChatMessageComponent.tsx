"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { CheckCircle, Clock, ArrowRight } from "lucide-react";
import { AITodoItem } from "@/lib/services/aiAgentService";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system' | 'todo-list' | 'analysis-step' | 'thinking';
  content: string;
  timestamp: Date;
  data?: any;
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface ChatMessageComponentProps {
  message: ChatMessage;
  isDarkMode: boolean;
  onConfirm?: () => void;
}

// Modern typing animation component
function TypingAnimation({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      // Variable typing speed for more natural feel
      const getTypingDelay = (char: string, prevChar?: string) => {
        if (char === ' ') return 30; // Faster for spaces
        if (/[.!?]/.test(char)) return 150; // Pause after sentence endings
        if (/[,;:]/.test(char)) return 80; // Pause after punctuation
        if (prevChar === ' ') return 50; // Slightly slower after spaces (word starts)
        return 35 + Math.random() * 20; // Base speed with slight variation
      };

      const currentChar = text[currentIndex];
      const prevChar = currentIndex > 0 ? text[currentIndex - 1] : undefined;
      const delay = getTypingDelay(currentChar, prevChar);

      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + currentChar);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      
      return () => clearTimeout(timer);
    } else if (onComplete) {
      // Small delay before calling onComplete for smoother transition
      const completionTimer = setTimeout(onComplete, 300);
      return () => clearTimeout(completionTimer);
    }
  }, [currentIndex, text, onComplete]);

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          className="ml-0.5 inline-block w-0.5 h-5 bg-current rounded-sm"
        />
      )}
    </span>
  );
}

export function ChatMessageComponent({ message, isDarkMode, onConfirm }: ChatMessageComponentProps) {
  const [showTyping, setShowTyping] = useState(message.type === 'ai' || message.type === 'system');

  const getMessageStyle = () => {
    if (message.type === 'user') {
      return clsx(
        "ml-auto max-w-md text-white rounded-2xl",
        isDarkMode ? "bg-blue-600" : "bg-blue-500"
      );
    }
    return clsx(
      "mr-auto max-w-2xl rounded-2xl",
      isDarkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("flex", message.type === 'user' ? "justify-end" : "justify-start")}
    >
      <div className={clsx("p-3 max-w-3xl", getMessageStyle())}>
        {message.type === 'todo-list' && message.data ? (
          <TodoListMessage todos={message.data} isDarkMode={isDarkMode} />
        ) : message.type === 'thinking' && message.data ? (
          <ThinkingMessage thinking={message.data} isDarkMode={isDarkMode} />
        ) : (
          <div>
            {showTyping && (message.type === 'ai' || message.type === 'system') ? (
              <TypingAnimation 
                text={message.content} 
                onComplete={() => setShowTyping(false)}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            {message.status === 'pending' && onConfirm && (
              <div className="flex items-center justify-end space-x-2 mt-3 pt-2 border-t border-opacity-20">
                <button
                  onClick={onConfirm}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all text-xs"
                >
                  <span>Start Analysis</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TodoListMessage({ todos, isDarkMode }: { todos: AITodoItem[], isDarkMode: boolean }) {
  const completedCount = todos.filter(todo => todo.status === 'completed').length;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Tasks ({completedCount}/{todos.length})</span>
      </div>
      
      <div className="space-y-1">
        {todos.slice(0, 3).map(todo => (
          <div key={todo.id} className="flex items-center space-x-2 text-xs">
            {todo.status === 'completed' ? '✓' : todo.status === 'in_progress' ? '⏳' : '○'}
            <span className={todo.status === 'completed' ? 'line-through opacity-75' : ''}>{todo.task}</span>
          </div>
        ))}
        {todos.length > 3 && (
          <div className="text-xs opacity-75">+{todos.length - 3} more...</div>
        )}
      </div>
    </div>
  );
}

function ThinkingMessage({ thinking, isDarkMode }: { thinking: any, isDarkMode: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <span className="text-xs opacity-75">🤔 Thinking...</span>
        <div className={clsx("w-12 rounded-full h-1", isDarkMode ? "bg-gray-600" : "bg-gray-300")}>
          <div 
            className="bg-blue-600 h-1 rounded-full transition-all duration-500"
            style={{ width: `${thinking.confidence * 100}%` }}
          />
        </div>
      </div>
      <p className="text-sm italic opacity-90">{thinking.currentThought}</p>
    </div>
  );
}

// Modern typing indicator
export function TypingIndicator({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className={clsx(
        "px-4 py-3 rounded-2xl max-w-xs",
        isDarkMode ? "bg-gray-700" : "bg-gray-100"
      )}>
        <div className="flex items-center space-x-1.5">
          <motion.div
            className={clsx("w-1.5 h-1.5 rounded-full", isDarkMode ? "bg-gray-400" : "bg-gray-500")}
            animate={{ 
              y: [0, -4, 0],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              delay: 0,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className={clsx("w-1.5 h-1.5 rounded-full", isDarkMode ? "bg-gray-400" : "bg-gray-500")}
            animate={{ 
              y: [0, -4, 0],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              delay: 0.15,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className={clsx("w-1.5 h-1.5 rounded-full", isDarkMode ? "bg-gray-400" : "bg-gray-500")}
            animate={{ 
              y: [0, -4, 0],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              delay: 0.3,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}