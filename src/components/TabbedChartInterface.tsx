"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, PieChart, TrendingUp, Activity } from "lucide-react";
import { clsx } from "clsx";
import { LazyCharts, LazyAdvancedCharts } from "./LazyCharts";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
}

const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: BarChart3,
    component: LazyCharts,
  },
  {
    id: "analytics",
    label: "Analytics", 
    icon: TrendingUp,
    component: LazyAdvancedCharts,
  },
  {
    id: "performance",
    label: "Performance",
    icon: Activity,
    component: LazyCharts,
  }
];

interface TabbedChartInterfaceProps {
  className?: string;
}

export function TabbedChartInterface({ className }: TabbedChartInterfaceProps) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];
  const ActiveComponent = activeTabData.component;

  return (
    <div className={clsx("bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden", className)}
         style={{ boxShadow: 'var(--shadow-lg)' }}>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200/50 bg-gray-50/30">
        <nav className="flex space-x-0" aria-label="Chart tabs">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "relative flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-all duration-200",
                  "hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  isActive
                    ? "text-blue-700 bg-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className={clsx(
                  "w-4 h-4 transition-colors duration-200",
                  isActive ? "text-blue-600" : "text-gray-500"
                )} />
                <span className="hidden sm:inline">{tab.label}</span>
                
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
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
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0.0, 0.2, 1]
            }}
            className="p-6"
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}