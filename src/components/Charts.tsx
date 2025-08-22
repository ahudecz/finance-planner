"use client";

import { motion } from "framer-motion";
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
import { Calendar, PieChart as PieChartIcon } from "lucide-react";
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

interface TimelineChartProps {
  data?: typeof timelineData;
  className?: string;
}

function TimelineChart({ data = timelineData, className }: TimelineChartProps) {
  // Transform data for bar chart visualization
  const chartData = data.map(item => ({
    name: item.name,
    start: item.start,
    duration: item.duration,
    end: item.start + item.duration,
    category: item.category
  }));

  // TODO: Implement dynamic category colors
  // const getCategoryColor = (category: string) => {
  //   const colors = {
  //     Management: "#4F46E5",
  //     Creative: "#7C3AED", 
  //     Technical: "#2563EB",
  //     Quality: "#059669",
  //     Operations: "#DC2626",
  //     Maintenance: "#D97706"
  //   };
  //   return colors[category as keyof typeof colors] || "#6B7280";
  // };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={clsx(
        "bg-white rounded-xl border border-gray-200 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-blue-50 p-4 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">10</span>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Project Timeline</h3>
              <p className="text-sm text-blue-600">Gantt Chart View</p>
            </div>
          </div>
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-64 w-full">
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

interface BudgetChartProps {
  data?: typeof budgetData;
  className?: string;
}

function BudgetChart({ data = budgetData, className }: BudgetChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
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
        "bg-white rounded-xl border border-gray-200 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-purple-50 p-4 border-b border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">11</span>
            </div>
            <div>
              <h3 className="font-semibold text-purple-900">Budget Breakdown</h3>
              <p className="text-sm text-purple-600">
                Total: ${total.toLocaleString()}
              </p>
            </div>
          </div>
          <PieChartIcon className="w-6 h-6 text-purple-600" />
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
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
      <div className="p-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-2">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(0);
            return (
              <div key={item.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm text-gray-600">
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

interface ChartsProps {
  timelineData?: typeof timelineData;
  budgetData?: typeof budgetData;
  className?: string;
}

export function Charts({ 
  timelineData: customTimelineData, 
  budgetData: customBudgetData, 
  className 
}: ChartsProps) {
  return (
    <div className={clsx("space-y-4", className)}>
      <TimelineChart data={customTimelineData} />
      <BudgetChart data={customBudgetData} />
    </div>
  );
}

export default Charts;
