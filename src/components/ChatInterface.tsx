"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Lightbulb, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatInterfaceProps {
  onIdeaSubmit?: (idea: string) => void;
  className?: string;
}

export function ChatInterface({ onIdeaSubmit, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Let me know what your business idea is and I'll help you plan the implementation, budget, and timeline.",
      sender: "assistant",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Call the idea submit handler
    if (onIdeaSubmit) {
      onIdeaSubmit(inputValue.trim());
    }

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Great idea! I'll help you analyze "${inputValue.trim()}". Let me break this down into key components: budget estimation, timeline planning, resource allocation, and risk assessment. I'll start generating the analysis now.`,
        sender: "assistant",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={clsx(
      "bg-white rounded-xl border-2 border-blue-200 flex flex-col h-full",
      className
    )}>
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
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Online</span>
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
                "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                message.sender === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              )}>
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
              </div>

              {message.sender === "user" && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start space-x-3"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">Analyzing your idea...</span>
              </div>
            </div>
          </motion.div>
        )}

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
              disabled={isLoading}
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <Lightbulb className="w-4 h-4" />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={clsx(
              "flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-200",
              inputValue.trim() && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isLoading ? (
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
  );
}
