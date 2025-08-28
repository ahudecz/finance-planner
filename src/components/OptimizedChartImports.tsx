"use client";

import dynamic from "next/dynamic";

// Optimized imports for chart libraries to reduce bundle size
// Only import what we actually use from each library

// Recharts - basic charts (lighter weight)
export {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// Nivo - advanced charts (lazy loaded)
// Using any for now as Nivo type exports are inconsistent across versions
export type NivoChartProps = any;

function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-gray-500 text-sm">Loading chart...</div>
    </div>
  );
}

// Dynamic imports for heavy Nivo components
export const ResponsivePie = dynamic(
  () => import("@nivo/pie").then(mod => ({ default: mod.ResponsivePie })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const ResponsiveBar = dynamic(
  () => import("@nivo/bar").then(mod => ({ default: mod.ResponsiveBar })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const ResponsiveLine = dynamic(
  () => import("@nivo/line").then(mod => ({ default: mod.ResponsiveLine })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const ResponsiveHeatMap = dynamic(
  () => import("@nivo/heatmap").then(mod => ({ default: mod.ResponsiveHeatMap })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);