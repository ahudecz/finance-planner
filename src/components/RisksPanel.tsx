"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Plus, Users } from "lucide-react";
import { RiskItem } from "@/types/domain";
import { clsx } from "clsx";
import { realtimeService, type RealtimeEvent } from "@/lib/services/realtimeService";

interface RisksPanelProps {
  ideaId: string;
}

// Fetch risks from API
async function fetchRisks(ideaId: string): Promise<RiskItem[]> {
  try {
    console.log("📋 Fetching risks for idea:", ideaId);
    
    const response = await fetch(`/api/risks?ideaId=${ideaId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch risks: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform API response to match RiskItem interface
    const risks: RiskItem[] = data.risks.map((risk: {
      id: string;
      ideaId: string;
      title: string;
      likelihood: string;
      impact: string;
      score: number;
      mitigation: string | null;
      createdAt: string;
    }) => ({
      id: risk.id,
      ideaId: risk.ideaId,
      title: risk.title,
      likelihood: convertLikelihoodToNumber(risk.likelihood),
      impact: convertImpactToNumber(risk.impact),
      score: risk.score,
      mitigation: risk.mitigation,
      createdAt: risk.createdAt,
    }));
    
    console.log(`✅ Fetched ${risks.length} risks for idea ${ideaId}`);
    return risks;
    
  } catch (error) {
    console.error("❌ Error fetching risks:", error);
    return []; // Return empty array on error
  }
}

// Convert text likelihood back to number for compatibility
function convertLikelihoodToNumber(likelihood: string): number {
  switch (likelihood.toLowerCase()) {
    case 'high': return 0.8;
    case 'medium': return 0.5;
    case 'low': return 0.2;
    default: return 0.5;
  }
}

// Convert text impact back to number for compatibility  
function convertImpactToNumber(impact: string): number {
  switch (impact.toLowerCase()) {
    case 'high': return 0.8;
    case 'medium': return 0.5;
    case 'low': return 0.2;
    default: return 0.5;
  }
}

// TODO: Implement risk color utility if needed
// function getRiskColor(score: number) {
//   if (score >= 0.7) return "destructive"; // High risk
//   if (score >= 0.4) return "secondary";   // Medium risk
//   return "outline";                       // Low risk
// }

function formatLikelihood(likelihood: number): string {
  if (likelihood >= 0.7) return "High";
  if (likelihood >= 0.4) return "Medium";
  return "Low";
}

function formatImpact(impact: number): string {
  if (impact >= 0.7) return "High";
  if (impact >= 0.4) return "Medium";
  return "Low";
}

export function RisksPanel({ ideaId }: RisksPanelProps) {
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  useEffect(() => {
    const loadRisks = async () => {
      try {
        const fetchedRisks = await fetchRisks(ideaId);
        // Sort by score descending and take top 5
        const topRisks = fetchedRisks
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        setRisks(topRisks);
      } catch (error) {
        console.error("Error fetching risks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRisks();

    // Subscribe to real-time updates
    const unsubscribe = realtimeService.subscribeToIdea(ideaId, {
      onRiskChange: (event: RealtimeEvent<RiskItem>) => {
        console.log("🎯 Real-time risk update:", event);
        
        switch (event.type) {
          case "risk_created":
            setRisks(prev => {
              const newRisks = [...prev, event.payload];
              return newRisks.sort((a, b) => b.score - a.score).slice(0, 5);
            });
            break;
          case "risk_updated":
            setRisks(prev => 
              prev.map(risk => 
                risk.id === event.payload.id ? event.payload : risk
              ).sort((a, b) => b.score - a.score).slice(0, 5)
            );
            break;
          case "risk_deleted":
            setRisks(prev => prev.filter(risk => risk.id !== event.payload.id));
            break;
        }
      },
      onUserJoin: (userId: string) => {
        setActiveUsers(prev => [...prev.filter(id => id !== userId), userId]);
      },
      onUserLeave: (userId: string) => {
        setActiveUsers(prev => prev.filter(id => id !== userId));
      },
      onError: (error) => {
        console.error("Real-time error:", error);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [ideaId]);

  const handleGenerateRisks = async () => {
    setIsGenerating(true);
    try {
      console.log("🎲 Generating risks for idea:", ideaId);
      
      // Call risk generation API
      const response = await fetch('/api/risks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ideaId }),
      });
      
      if (!response.ok) {
        throw new Error(`Risk generation failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("✅ Generated risks:", result);
      
      // Refresh the risks list to show newly generated risks
      const updatedRisks = await fetchRisks(ideaId);
      setRisks(updatedRisks.sort((a, b) => b.score - a.score).slice(0, 5));
      
    } catch (error) {
      console.error("❌ Error generating risks:", error);
      // You could show an error toast here
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">#7 Risks</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 p-4 border-b border-red-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">7</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-900">RISKS</h3>
              {risks.length > 0 && (
                <p className="text-sm text-red-600">
                  Top {risks.length} identified risks
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {activeUsers.length > 0 && (
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600">{activeUsers.length}</span>
              </div>
            )}
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">

        {risks.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">
              No risks identified yet
            </p>
            <button
              onClick={handleGenerateRisks}
              disabled={isGenerating}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isGenerating ? "Generating..." : "Generate Risks"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {risks.map((risk, index) => (
              <motion.div
                key={risk.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 text-sm leading-tight">
                    {risk.title}
                  </h4>
                  <span className={clsx(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    risk.score >= 7 ? "bg-red-100 text-red-800" :
                    risk.score >= 4 ? "bg-yellow-100 text-yellow-800" :
                    "bg-green-100 text-green-800"
                  )}>
                    {Math.round(risk.score * 10)}%
                  </span>
                </div>
                
                <div className="flex gap-4 text-xs text-gray-500 mb-2">
                  <span>
                    <strong>Likelihood:</strong> {formatLikelihood(risk.likelihood)}
                  </span>
                  <span>
                    <strong>Impact:</strong> {formatImpact(risk.impact)}
                  </span>
                </div>
                
                {risk.mitigation && (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </p>
                )}
              </motion.div>
            ))}
            
            <button
              onClick={handleGenerateRisks}
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isGenerating ? "Regenerating..." : "Regenerate Risks"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
