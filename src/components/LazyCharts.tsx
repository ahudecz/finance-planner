"use client";

import { Suspense, lazy } from "react";
import { motion } from "framer-motion";

// Lazy load chart components to reduce initial bundle size
const Charts = lazy(() => import("./Charts"));
const AdvancedCharts = lazy(() => import("./AdvancedCharts"));

// Loading component for charts
function ChartSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center"
    >
      <div className="text-gray-500 text-sm">Loading chart...</div>
    </motion.div>
  );
}

// Lazy wrapper for basic charts
export function LazyCharts(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Charts {...props} />
    </Suspense>
  );
}

// Lazy wrapper for advanced charts
export function LazyAdvancedCharts(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <AdvancedCharts {...props} />
    </Suspense>
  );
}