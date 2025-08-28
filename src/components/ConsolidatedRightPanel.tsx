"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Settings, 
  AlertTriangle, 
  ChevronDown,
  ChevronRight,
  Plus
} from "lucide-react";
import { clsx } from "clsx";
import { ResourcePanels } from "./ResourcePanels";
import { RisksPanel } from "./RisksPanel";
import { TechnicalPanel } from "./TechnicalPanel";

interface PanelSection {
  id: string;
  title: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
  props?: any;
}

interface ConsolidatedRightPanelProps {
  ideaId?: string;
  isLoading?: boolean;
  onAddInternal?: () => void;
  onAddExternal?: () => void;
  onAddRequirement?: () => void;
  className?: string;
}

export function ConsolidatedRightPanel({ 
  ideaId,
  isLoading,
  onAddInternal,
  onAddExternal,
  onAddRequirement,
  className 
}: ConsolidatedRightPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("resources");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const sections: PanelSection[] = [
    {
      id: "resources",
      title: "Resources",
      icon: Users,
      component: ResourcePanels,
      props: {
        isLoading,
        onAddInternal,
        onAddExternal
      }
    },
    {
      id: "risks", 
      title: "Risk Assessment",
      icon: AlertTriangle,
      component: RisksPanel,
      props: {
        ideaId
      }
    },
    {
      id: "technical",
      title: "Technical",
      icon: Settings,
      component: TechnicalPanel,
      props: {
        isLoading,
        onAddRequirement
      }
    }
  ];

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden"
           style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="border-b border-gray-200/50 bg-gray-50/30">
          <nav className="flex" aria-label="Panel tabs">
            {sections.map((section) => {
              const isActive = section.id === activeTab;
              const Icon = section.icon;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={clsx(
                    "relative flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 text-xs font-medium transition-all duration-200",
                    "hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    isActive
                      ? "text-blue-700 bg-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Icon className={clsx(
                    "w-3.5 h-3.5 transition-colors duration-200",
                    isActive ? "text-blue-600" : "text-gray-500"
                  )} />
                  <span className="hidden md:inline">{section.title}</span>
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activePanelTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="relative max-h-[600px] overflow-y-auto">
          <AnimatePresence mode="wait">
            {sections.map((section) => {
              if (section.id !== activeTab) return null;
              
              const Component = section.component;
              
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0.0, 0.2, 1]
                  }}
                  className="p-4"
                >
                  <Component {...section.props} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick Actions - Collapsible */}
      <motion.div 
        className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <button
          onClick={() => toggleSection("actions")}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50/30 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-gray-900">Quick Actions</span>
          </div>
          {collapsedSections.has("actions") ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        
        <AnimatePresence>
          {!collapsedSections.has("actions") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
              className="overflow-hidden border-t border-gray-200/50"
            >
              <div className="p-4 space-y-3">
                <button
                  onClick={onAddInternal}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors duration-200"
                >
                  + Add Internal Resource
                </button>
                <button
                  onClick={onAddExternal}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors duration-200"
                >
                  + Add External Resource
                </button>
                <button
                  onClick={onAddRequirement}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors duration-200"
                >
                  + Add Technical Requirement
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}