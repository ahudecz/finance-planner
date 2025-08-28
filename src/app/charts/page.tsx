"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Calendar, PieChart as PieChartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { 
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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { clsx } from "clsx";

// Mock timeline data for Gantt-style chart
const timelineData = [
  { name: "Planning", start: 0, duration: 3, category: "Management" },
  { name: "Design", start: 2, duration: 5, category: "Creative" },
  { name: "Development", start: 4, duration: 8, category: "Technical" },
  { name: "Testing", start: 10, duration: 3, category: "Quality" },
  { name: "Deployment", start: 12, duration: 2, category: "Operations" },
  { name: "Support", start: 13, duration: 5, category: "Maintenance" }
];

// Mock budget breakdown data
const budgetData = [
  { name: "CAPEX", value: 10000, color: "#4F46E5" },
  { name: "OPEX", value: 2400, color: "#7C3AED" },
  { name: "Resources", value: 4500, color: "#2563EB" },
  { name: "External", value: 1600, color: "#DC2626" }
];

const COLORS = ["#4F46E5", "#7C3AED", "#2563EB", "#DC2626"];

function TimelineChart({ data = timelineData, className }: { data?: typeof timelineData; className?: string }) {
  // Transform data for bar chart visualization
  const chartData = data.map(item => ({
    name: item.name,
    start: item.start,
    duration: item.duration,
    end: item.start + item.duration,
    category: item.category
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={clsx(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 border-b border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">10</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Project Timeline</h3>
              <p className="text-blue-600 dark:text-blue-300">Gantt Chart View</p>
            </div>
          </div>
          <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[0, 'dataMax']}
                tickFormatter={(value) => `Day ${value}`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'duration' ? `${value} days` : value,
                  name === 'duration' ? 'Duration' : name
                ]}
                labelFormatter={(label) => `Task: ${label}`}
              />
              <Bar 
                dataKey="duration" 
                fill="#4F46E5"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function BudgetChart({ data = budgetData, className }: { data?: typeof budgetData; className?: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ${data.value.toLocaleString()} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className={clsx(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-purple-50 dark:bg-purple-900/20 p-6 border-b border-purple-100 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">11</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100">Budget Breakdown</h3>
              <p className="text-purple-600 dark:text-purple-300">
                Total: ${total.toLocaleString()}
              </p>
            </div>
          </div>
          <PieChartIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>
                    {value}: ${entry.payload?.value?.toLocaleString()}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="p-6 border-t border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(0);
            return (
              <div key={item.name} className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {percentage}% {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChartsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExport = () => {
    console.log("Exporting charts...");
    // TODO: Implement chart export functionality
  };

  return (
    <ProtectedRoute requireAuth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/30 transition-all duration-500">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 px-6 py-4 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Charts Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Project Timeline & Budget Breakdown
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                <span>Export Charts</span>
              </button>
              <DarkModeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* Page Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Project Analytics
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive visualization of project timeline and budget allocation
              </p>
            </motion.div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <TimelineChart />
              <BudgetChart />
            </div>

            {/* Additional Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chart Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Project Timeline (Chart 10)</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Displays the project phases with their durations in a Gantt chart format. 
                    Each bar represents a task with its duration in days.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-2">Budget Breakdown (Chart 11)</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Shows the distribution of project budget across different categories including 
                    CAPEX, OPEX, Resources, and External costs.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}