/**
 * Risk Register - Mock Risk Generation for MVP
 * 
 * This module provides deterministic risk generation based on company brief data.
 * In production, this would be replaced with AI-powered risk analysis.
 */

export interface MockRiskItem {
  title: string;
  likelihood: number; // 0.0 to 1.0
  impact: number; // 0.0 to 1.0
  mitigation?: string;
}

// Base risk templates with common business risks
const RISK_TEMPLATES: MockRiskItem[] = [
  {
    title: "Data Security Breach",
    likelihood: 0.2,
    impact: 0.9,
    mitigation: "Implement comprehensive security controls, regular penetration testing, and incident response procedures"
  },
  {
    title: "AI Model Hallucination",
    likelihood: 0.4,
    impact: 0.6,
    mitigation: "Deploy human oversight, confidence thresholds, and validation checks for AI-generated content"
  },
  {
    title: "System Integration Failure",
    likelihood: 0.3,
    impact: 0.7,
    mitigation: "Thorough integration testing, fallback systems, and phased rollout approach"
  },
  {
    title: "Budget Cost Overrun",
    likelihood: 0.3,
    impact: 0.5,
    mitigation: "Regular budget monitoring, milestone-based approvals, and contingency reserves"
  },
  {
    title: "User Adoption Resistance",
    likelihood: 0.5,
    impact: 0.5,
    mitigation: "Change management program, user training, and gradual feature introduction"
  },
  {
    title: "Regulatory Compliance Gap",
    likelihood: 0.25,
    impact: 0.8,
    mitigation: "Legal review, compliance audit, and regular regulatory monitoring"
  },
  {
    title: "Third-party Vendor Lock-in",
    likelihood: 0.4,
    impact: 0.4,
    mitigation: "Multi-vendor strategy, data portability requirements, and exit clauses in contracts"
  },
  {
    title: "Performance Scalability Issues",
    likelihood: 0.35,
    impact: 0.6,
    mitigation: "Load testing, auto-scaling infrastructure, and performance monitoring"
  }
];

/**
 * Generate mock risks based on company brief data
 * 
 * @param brief - Company brief JSON containing company info and project context
 * @returns Array of 3-5 risk items with calculated scores
 */
export function generateMockRisks(brief: Record<string, unknown>): MockRiskItem[] {
  const risks: MockRiskItem[] = [];
  
  // Extract company context for risk customization
  const company = (brief?.company || {}) as Record<string, unknown>;
  const orgSize = brief?.size_band || brief?.orgSize || "Unknown";
  
  console.log("🎲 Generating risks for:", {
    companyName: company.name as string,
    orgSize,
    hasLinkedIn: !!company.linkedinUrl,
    privacyMode: company.privacyRedaction
  });

  // Always include data security risk (critical for all companies)
  risks.push({
    ...RISK_TEMPLATES[0],
    // Adjust likelihood based on privacy settings
    likelihood: company.privacyRedaction ? 0.15 : 0.25,
  });

  // Include AI/model risks for tech projects
  risks.push({
    ...RISK_TEMPLATES[1],
    // Higher likelihood for smaller companies (less AI expertise)
    likelihood: orgSize === "<20" || orgSize === "20–200" ? 0.5 : 0.35,
  });

  // Integration risks scale with company size
  risks.push({
    ...RISK_TEMPLATES[2],
    likelihood: orgSize === ">10k" ? 0.4 : 0.25, // More complex integrations in large orgs
    impact: orgSize === "<20" ? 0.5 : 0.7, // Higher impact on small companies
  });

  // Budget risks vary by org size
  const budgetRisk = { ...RISK_TEMPLATES[3] };
  if (orgSize === "<20") {
    budgetRisk.likelihood = 0.4; // Higher for small companies
    budgetRisk.impact = 0.7; // More impactful
  } else if (orgSize === ">10k") {
    budgetRisk.likelihood = 0.2; // Better budget controls
    budgetRisk.impact = 0.3; // Less relative impact
  }
  risks.push(budgetRisk);

  // Adoption risk based on company characteristics
  const adoptionRisk = { ...RISK_TEMPLATES[4] };
  if (orgSize === ">10k") {
    adoptionRisk.likelihood = 0.6; // Harder to change in large orgs
    adoptionRisk.impact = 0.4; // But less critical impact
  } else if (orgSize === "<20") {
    adoptionRisk.likelihood = 0.3; // Easier to adapt in small teams
    adoptionRisk.impact = 0.7; // But more critical for success
  }
  risks.push(adoptionRisk);

  // Randomly add 0-1 additional risks for variety
  const additionalRiskCount = Math.random() > 0.5 ? 1 : 0;
  if (additionalRiskCount > 0) {
    const remainingRisks = RISK_TEMPLATES.slice(5);
    const randomRisk = remainingRisks[Math.floor(Math.random() * remainingRisks.length)];
    risks.push(randomRisk);
  }

  console.log(`✅ Generated ${risks.length} risks for ${(company.name as string) || 'company'}`);
  
  return risks;
}

/**
 * Calculate risk score from likelihood and impact
 * Uses standard risk matrix: Score = Likelihood × Impact × 10
 * 
 * @param likelihood - Probability (0.0 to 1.0)
 * @param impact - Impact severity (0.0 to 1.0)
 * @returns Risk score (0.0 to 10.0)
 */
export function calculateRiskScore(likelihood: number, impact: number): number {
  return Math.round(likelihood * impact * 10 * 100) / 100; // Round to 2 decimal places
}

/**
 * Get risk level category based on score
 * 
 * @param score - Risk score (0.0 to 10.0)
 * @returns Risk level string
 */
export function getRiskLevel(score: number): "Low" | "Medium" | "High" {
  if (score >= 6.0) return "High";
  if (score >= 3.0) return "Medium";
  return "Low";
}

/**
 * Convert likelihood number to descriptive text
 * 
 * @param likelihood - Likelihood value (0.0 to 1.0)
 * @returns Descriptive likelihood text
 */
export function getLikelihoodText(likelihood: number): "Low" | "Medium" | "High" {
  if (likelihood >= 0.6) return "High";
  if (likelihood >= 0.3) return "Medium";
  return "Low";
}

/**
 * Convert impact number to descriptive text
 * 
 * @param impact - Impact value (0.0 to 1.0) 
 * @returns Descriptive impact text
 */
export function getImpactText(impact: number): "Low" | "Medium" | "High" {
  if (impact >= 0.6) return "High";
  if (impact >= 0.3) return "Medium";
  return "Low";
}
