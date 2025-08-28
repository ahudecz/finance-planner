"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Network,
  Calendar,
  Settings,
  Download,
  Maximize2
} from "lucide-react";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { clsx } from "clsx";

// Enhanced chart data interfaces
interface ChartData {
  timeline: TimelineData[];
  budget: BudgetData[];
  trends: TrendData[];
  heatmap: any[];
  riskHeatmap: HeatmapData[];
}

interface TimelineData {
  task: string;
  start: number;
  duration: number;
  category: string;
  progress: number;
  dependencies: string[];
}

interface BudgetData {
  id: string;
  label: string;
  value: number;
  color: string;
  breakdown?: Array<{ label: string; value: number }>;
}

interface TrendData {
  id: string;
  data: Array<{ x: string; y: number }>;
}

interface HeatmapData {
  id: string;
  data: Array<{ x: string; y: number }>;
}

interface AdvancedChartProps {
  data: ChartData;
  onExport?: (chartType: string, format: 'png' | 'svg' | 'pdf') => void;
  className?: string;
}

type ChartType = 'timeline' | 'budget' | 'trends' | 'heatmap';

export function AdvancedCharts({ data = defaultChartData, onExport, className }: AdvancedChartProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('timeline');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartSettings, setChartSettings] = useState({
    showLegend: true,
    showGrid: true,
    showTooltips: true,
    theme: 'light' as 'light' | 'dark'
  });

  // Ensure data has the required structure
  const chartData = {
    timeline: data?.timeline || defaultChartData.timeline,
    budget: data?.budget || defaultChartData.budget,
    trends: data?.trends || defaultChartData.trends,
    heatmap: data?.heatmap || [],
    riskHeatmap: data?.riskHeatmap || []
  };

  const chartTypes = [
    { id: 'timeline' as ChartType, label: 'Timeline', icon: Calendar },
    { id: 'budget' as ChartType, label: 'Budget', icon: PieChartIcon },
    { id: 'trends' as ChartType, label: 'Trends', icon: TrendingUp },
    { id: 'heatmap' as ChartType, label: 'Risk Heat', icon: Network }
  ];

  return (
    <div className={clsx(
      "space-y-4",
      isFullscreen && "fixed inset-0 z-50 bg-white p-6",
      className
    )}>
      {/* Enhanced Timeline Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        {/* Chart Header */}
        <div className="bg-blue-50 p-4 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">10</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">ADVANCED CHARTS</h3>
                <p className="text-sm text-blue-600">Interactive data visualization</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onExport?.(activeChart, 'png')}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex items-center space-x-1 mt-4">
            {chartTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveChart(type.id)}
                className={clsx(
                  "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeChart === type.id
                    ? "bg-blue-600 text-white"
                    : "text-blue-600 hover:bg-blue-100"
                )}
              >
                <type.icon className="w-4 h-4" />
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart Content */}
        <div className={clsx(
          "p-4",
          isFullscreen ? "h-[calc(100vh-200px)]" : "h-96"
        )}>
          {activeChart === 'timeline' && (
            <EnhancedTimelineChart 
              data={chartData.timeline} 
              settings={chartSettings}
            />
          )}
          {activeChart === 'budget' && (
            <EnhancedBudgetChart 
              data={chartData.budget} 
              settings={chartSettings}
            />
          )}
          {activeChart === 'trends' && (
            <EnhancedTrendsChart 
              data={chartData.trends} 
              settings={chartSettings}
            />
          )}
          {activeChart === 'heatmap' && (
            <RiskHeatmapChart 
              data={chartData.riskHeatmap} 
              settings={chartSettings}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Enhanced Timeline Chart Component
function EnhancedTimelineChart({ 
  data, 
  settings 
}: { 
  data: TimelineData[]; 
  settings: any; 
}) {
  const chartData = data.map(item => ({
    task: item.task,
    duration: item.duration,
    progress: item.progress,
    category: item.category
  }));

  return (
    <ResponsiveBar
      data={chartData}
      keys={['duration', 'progress']}
      indexBy="task"
      margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
      padding={0.3}
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={['#3B82F6', '#10B981']}
      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Tasks',
        legendPosition: 'middle',
        legendOffset: 32
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Days',
        legendPosition: 'middle',
        legendOffset: -40
      }}
      enableGridX={settings.showGrid}
      enableGridY={settings.showGrid}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
      legends={settings.showLegend ? [{
        dataFrom: 'keys',
        anchor: 'bottom-right',
        direction: 'column',
        justify: false,
        translateX: 120,
        translateY: 0,
        itemsSpacing: 2,
        itemWidth: 100,
        itemHeight: 20,
        itemDirection: 'left-to-right',
        itemOpacity: 0.85,
        symbolSize: 20,
        effects: [{
          on: 'hover',
          style: {
            itemOpacity: 1
          }
        }]
      }] : []}
      animate={true}
    />
  );
}

// Enhanced Budget Chart Component
function EnhancedBudgetChart({ 
  data, 
  settings 
}: { 
  data: BudgetData[]; 
  settings: any; 
}) {
  return (
    <ResponsivePie
      data={data}
      margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
      innerRadius={0.5}
      padAngle={0.7}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      colors={{ datum: 'data.color' }}
      borderWidth={1}
      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor="#333333"
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: 'color' }}
      arcLabelsSkipAngle={10}
      arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
      enableArcLinkLabels={settings.showLegend}
      animate={true}


      legends={settings.showLegend ? [{
        anchor: 'bottom',
        direction: 'row',
        justify: false,
        translateX: 0,
        translateY: 56,
        itemsSpacing: 0,
        itemWidth: 100,
        itemHeight: 18,
        itemTextColor: '#999',
        itemDirection: 'left-to-right',
        itemOpacity: 1,
        symbolSize: 18,
        symbolShape: 'circle',
        effects: [{
          on: 'hover',
          style: {
            itemTextColor: '#000'
          }
        }]
      }] : []}
    />
  );
}

// Enhanced Trends Chart Component  
function EnhancedTrendsChart({ 
  data, 
  settings 
}: { 
  data: TrendData[]; 
  settings: any; 
}) {
  return (
    <ResponsiveLine
      data={data}
      margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
      yFormat=" >-.2f"
      curve="cardinal"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Time',
        legendOffset: 36,
        legendPosition: 'middle'
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Value',
        legendOffset: -40,
        legendPosition: 'middle'
      }}
      enableGridX={settings.showGrid}
      enableGridY={settings.showGrid}
      colors={{ scheme: 'category10' }}
      pointSize={10}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={2}
      pointBorderColor={{ from: 'serieColor' }}
      pointLabelYOffset={-12}
      useMesh={true}
      animate={true}


      legends={settings.showLegend ? [{
        anchor: 'bottom-right',
        direction: 'column',
        justify: false,
        translateX: 100,
        translateY: 0,
        itemsSpacing: 0,
        itemDirection: 'left-to-right',
        itemWidth: 80,
        itemHeight: 20,
        itemOpacity: 0.75,
        symbolSize: 12,
        symbolShape: 'circle',
        symbolBorderColor: 'rgba(0, 0, 0, .5)',
        effects: [{
          on: 'hover',
          style: {
            itemBackground: 'rgba(0, 0, 0, .03)',
            itemOpacity: 1
          }
        }]
      }] : []}
    />
  );
}

// Risk Heatmap Chart Component
function RiskHeatmapChart({ 
  data, 
  settings 
}: { 
  data: HeatmapData[]; 
  settings: any; 
}) {
  return (
    <ResponsiveHeatMap
      data={data}
      margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
      valueFormat=">-.2s"
      axisTop={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: -90,
        legend: '',
        legendOffset: 46
      }}
      axisRight={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Impact',
        legendPosition: 'middle',
        legendOffset: 70
      }}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: -90,
        legend: 'Likelihood',
        legendPosition: 'middle',
        legendOffset: 46
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Risk Level',
        legendPosition: 'middle',
        legendOffset: -72
      }}
      colors={{
        type: 'diverging',
        scheme: 'red_yellow_blue',
        divergeAt: 0.5,
        minValue: 0,
        maxValue: 1
      }}
      emptyColor="#555555"
      borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
      labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
      animate={true}
      hoverTarget="cell"

    />
  );
}

// Default props and mock data
const defaultChartData: ChartData = {
  timeline: [
    { task: 'Planning', start: 0, duration: 5, category: 'Management', progress: 5, dependencies: [] },
    { task: 'Design', start: 3, duration: 8, category: 'Creative', progress: 6, dependencies: ['Planning'] },
    { task: 'Development', start: 8, duration: 12, category: 'Technical', progress: 8, dependencies: ['Design'] },
    { task: 'Testing', start: 18, duration: 4, category: 'Quality', progress: 2, dependencies: ['Development'] },
    { task: 'Deployment', start: 20, duration: 2, category: 'Operations', progress: 0, dependencies: ['Testing'] }
  ],
  budget: [
    { id: 'capex', label: 'CAPEX', value: 45000, color: '#3B82F6' },
    { id: 'opex', label: 'OPEX', value: 12000, color: '#8B5CF6' },
    { id: 'resources', label: 'Resources', value: 28000, color: '#10B981' },
    { id: 'external', label: 'External', value: 15000, color: '#F59E0B' }
  ],
  trends: [
    {
      id: 'budget',
      data: [
        { x: 'Jan', y: 10000 },
        { x: 'Feb', y: 12000 },
        { x: 'Mar', y: 15000 },
        { x: 'Apr', y: 18000 },
        { x: 'May', y: 16000 },
        { x: 'Jun', y: 20000 }
      ]
    },
    {
      id: 'savings',
      data: [
        { x: 'Jan', y: 2000 },
        { x: 'Feb', y: 3000 },
        { x: 'Mar', y: 4500 },
        { x: 'Apr', y: 6000 },
        { x: 'May', y: 7500 },
        { x: 'Jun', y: 9000 }
      ]
    }
  ],
  heatmap: [],
  riskHeatmap: [
    {
      id: 'Technical',
      data: [
        { x: 'Low', y: 2 },
        { x: 'Medium', y: 5 },
        { x: 'High', y: 8 }
      ]
    },
    {
      id: 'Financial',
      data: [
        { x: 'Low', y: 3 },
        { x: 'Medium', y: 6 },
        { x: 'High', y: 9 }
      ]
    },
    {
      id: 'Operational',
      data: [
        { x: 'Low', y: 1 },
        { x: 'Medium', y: 4 },
        { x: 'High', y: 7 }
      ]
    }
  ]
};

// Export with default data
export function Charts({ 
  timelineData, 
  budgetData, 
  className 
}: { 
  timelineData?: any; 
  budgetData?: any; 
  className?: string; 
}) {
  const handleExport = (chartType: string, format: 'png' | 'svg' | 'pdf') => {
    console.log(`Exporting ${chartType} as ${format}`);
    // TODO: Implement actual export functionality
  };

  return (
    <AdvancedCharts 
      data={defaultChartData} 
      onExport={handleExport}
      className={className}
    />
  );
}

export default AdvancedCharts;
