"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Download, FileText, Sheet, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { InfoCards } from "@/components/InfoCards";
import { ChatInterface } from "@/components/ChatInterface";
// Removed unused imports - these are now part of ConsolidatedRightPanel
import { TabbedChartInterface } from "@/components/TabbedChartInterface";
import { ConsolidatedRightPanel } from "@/components/ConsolidatedRightPanel";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { processIdeaSubmission, type DashboardData } from "@/lib/services/dashboardService";
import { exportDashboardSummary } from "@/lib/services/exportService";
import { PermissionWrapper } from "@/components/PermissionWrapper";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/services/authService";
import { AIAnalysisProgress } from "@/lib/services/aiService";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    capex: 0,
    opex: 0,
    timeline: 0,
    savings: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<AIAnalysisProgress | null>(null);
  
  const { signOut, profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  // Load dashboard data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log("🔄 Loading dashboard data...");
        
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        console.log("✅ Dashboard data loaded:", data);
        
        setDashboardData(data);
      } catch (error) {
        console.error("❌ Error loading dashboard data:", error);
        
        // Fallback to demo data
        setDashboardData({
          companyName: "Ginyard Co. (Demo)",
          companySize: "20-200 FTEs",
          capex: 10000,
          opex: 200,
          timeline: 15,
          savings: 10000,
          currentIdeaId: "550e8400-e29b-41d4-a716-446655440000"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleIdeaSubmit = async (idea: string) => {
    console.log("💡 New idea submitted:", idea);
    
    try {
      const result = await processIdeaSubmission(idea, dashboardData.projectId);
      
      if (result.success) {
        console.log("✅ Idea processed successfully:", result.message);
        
        // Refresh dashboard data
        const response = await fetch('/api/dashboard');
        if (response.ok) {
          const updatedData = await response.json();
          setDashboardData(updatedData);
        }
      } else {
        console.error("❌ Failed to process idea:", result.message);
      }
    } catch (error) {
      console.error("❌ Error processing idea submission:", error);
    }
  };

  const handleAnalysisComplete = async (results: AIAnalysisProgress) => {
    console.log("🎯 AI Analysis completed:", results);
    
    setAiAnalysisResults(results);
    
    // Update dashboard data with AI analysis results
    if (results.isComplete && results.results.budget && results.results.timeline) {
      const budgetData = results.results.budget.data;
      const timelineData = results.results.timeline.data;
      
      const updatedDashboardData = {
        ...dashboardData,
        capex: budgetData?.capex?.total || dashboardData.capex,
        opex: budgetData?.opex?.monthly || dashboardData.opex,
        timeline: timelineData?.total_duration_weeks || dashboardData.timeline,
        savings: budgetData?.roi_projection?.year_3_roi ? 
          Math.round((budgetData.total_investment * budgetData.roi_projection.year_3_roi) / 100) : 
          dashboardData.savings
      };
      
      setDashboardData(updatedDashboardData);
      console.log("📊 Dashboard updated with AI analysis data");
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!dashboardData.currentIdeaId) return;
    
    try {
      setIsExporting(true);
      console.log(`📊 Exporting dashboard as ${format}...`);
      
      // Fetch current risks for export
      const risks = await fetch(`/api/risks?ideaId=${dashboardData.currentIdeaId}`)
        .then(res => res.json())
        .catch(() => []);
      
      await exportDashboardSummary(dashboardData, risks, format);
      
      console.log(`✅ Export completed successfully`);
    } catch (error) {
      console.error("❌ Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ProtectedRoute requireAuth>
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/30 transition-all duration-500">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Compact Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 px-6 py-2 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Finance Planner Dashboard</h1>
              <p className="text-gray-600 text-xs">
                AI-powered business idea analysis and planning
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <PermissionWrapper permission="export_data">
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export</span>
                  </button>
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <button
                      onClick={() => handleExport('pdf')}
                      disabled={isExporting || !dashboardData.currentIdeaId}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 first:rounded-t-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Export as PDF</span>
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      disabled={isExporting || !dashboardData.currentIdeaId}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Sheet className="w-4 h-4" />
                      <span>Export as Excel</span>
                    </button>
                  </div>
                </div>
              </PermissionWrapper>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white/80 transition-all duration-200 w-56 text-sm"
                />
              </div>

              <DarkModeToggle />

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Welcome, {profile?.fullName || profile?.email}</span>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{profile?.role}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/30 transition-all duration-500">
          <div className="p-3 space-y-3 h-full">
            {/* Compact Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <InfoCards
                companyName={dashboardData.companyName}
                companySize={dashboardData.companySize}
                capex={dashboardData.capex}
                opex={dashboardData.opex}
                timeline={dashboardData.timeline}
                savings={dashboardData.savings}
                isLoading={isLoading}
                onCompanyClick={() => console.log("Edit company")}
                onBudgetClick={() => console.log("View budget details")}
                onTimelineClick={() => console.log("View timeline")}
                onSavingsClick={() => console.log("View savings breakdown")}
                agentIsActive={false}
                agentCurrentStage={'vision'}
                agentProgress={0}
              />
            </motion.div>

            {/* 12-Column Grid Layout */}
            <motion.div 
              className="grid grid-cols-12 gap-3 h-[calc(100vh-220px)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {/* Left Column - Chat Interface (7 columns) */}
              <motion.div
                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 0.5, 
                  delay: 0.3,
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }}
                className="col-span-12 xl:col-span-7 flex flex-col space-y-3 min-h-0"
              >
                {/* Chat Interface with AI Agent */}
                <motion.div 
                  className="flex-1 min-h-0"
                  whileHover={{ scale: 1.005 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatInterface 
                    onIdeaSubmit={handleIdeaSubmit}
                    onAnalysisComplete={handleAnalysisComplete}
                    className="h-full"
                  />
                </motion.div>
                
                {/* Integrated Charts */}
                <motion.div 
                  className="h-64 flex-shrink-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  whileHover={{ 
                    y: -2,
                    transition: { duration: 0.2 }
                  }}
                >
                  <TabbedChartInterface />
                </motion.div>
              </motion.div>

              {/* Right Column - Consolidated Panel (5 columns) */}
              <motion.div
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 0.5, 
                  delay: 0.4,
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }}
                className="col-span-12 xl:col-span-5 min-h-0"
                whileHover={{ 
                  scale: 1.005,
                  transition: { duration: 0.2 }
                }}
              >
                <ConsolidatedRightPanel
                  ideaId={dashboardData.currentIdeaId}
                  isLoading={isLoading}
                  onAddInternal={() => console.log("Add internal resource")}
                  onAddExternal={() => console.log("Add external resource")}
                  onAddRequirement={() => console.log("Add technical requirement")}
                  className="h-full"
                />
              </motion.div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
