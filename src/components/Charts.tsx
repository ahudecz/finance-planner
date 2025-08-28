"use client";

import { motion } from "framer-motion";
import { PieChart } from "lucide-react";
import { clsx } from "clsx";

// Chart data moved to /charts page

// Interfaces and components moved to /charts page

interface ChartsProps {
  className?: string;
}

export function Charts({ 
  className 
}: ChartsProps) {
  return (
    <div className={clsx("space-y-4", className)}>
      {/* Charts 10 and 11 have been moved to /charts page */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Charts Moved
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Project Timeline and Budget Breakdown charts have been moved to a dedicated page.
          </p>
          <a
            href="/charts"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            <PieChart className="w-4 h-4" />
            <span>View Charts</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default Charts;
