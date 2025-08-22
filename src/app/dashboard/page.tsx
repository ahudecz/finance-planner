"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Download, FileText, Sheet, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { InfoCards } from "@/components/InfoCards";
import { ChatInterface } from "@/components/ChatInterface";
import { ResourcePanels } from "@/components/ResourcePanels";
import { RisksPanel } from "@/components/RisksPanel";
import { TechnicalPanel } from "@/components/TechnicalPanel";
import { LazyCharts } from "@/components/LazyCharts";
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
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">INSTRUCTIONS</h1>
              <p className="text-gray-600 text-sm mt-1">
                Lorem ipsum (pls fill this field with the instructions)
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <PermissionWrapper permission="export_data">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting || !dashboardData.currentIdeaId}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={isExporting || !dashboardData.currentIdeaId}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sheet className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                </div>
              </PermissionWrapper>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>

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
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Top Info Cards */}
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
                onSizeClick={() => console.log("Edit size")}
                onCapexClick={() => console.log("View CAPEX details")}
                onOpexClick={() => console.log("View OPEX details")}
                onTimelineClick={() => console.log("View timeline")}
                onSavingsClick={() => console.log("View savings breakdown")}
              />
            </motion.div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Chat Interface */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="lg:col-span-2"
              >
                <div className="grid grid-cols-1 gap-6">
                  {/* Chat Interface with AI Agent */}
                  <div>
                    <ChatInterface 
                      onIdeaSubmit={handleIdeaSubmit}
                      onAnalysisComplete={handleAnalysisComplete}
                    />
                  </div>
                  
                  {/* Charts Row */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <LazyCharts />
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Panels */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-6"
              >
                {/* Resource Panels */}
                <ResourcePanels
                  isLoading={isLoading}
                  onAddInternal={() => console.log("Add internal resource")}
                  onAddExternal={() => console.log("Add external resource")}
                />
                
                {/* Risks Panel */}
                {dashboardData.currentIdeaId && (
                  <RisksPanel ideaId={dashboardData.currentIdeaId} />
                )}
                
                {/* Technical Requirements Panel */}
                <TechnicalPanel
                  isLoading={isLoading}
                  onAddRequirement={() => console.log("Add technical requirement")}
                />
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
