/**
 * Domain type definitions for Finance Planner
 */

// Organization size bands for company classification
export type OrgSize = "<20" | "20–200" | "200–1k" | "1k–10k" | ">10k" | "Unknown";

// Company information for widget #1
export interface Company {
  name: string;
  domain?: string;        // e.g., ginyardco.com
  linkedinUrl?: string;   // https://www.linkedin.com/company/...
  privacyRedaction?: boolean;
}

// Risk item for widget #7
export interface RiskItem {
  id: string;
  ideaId: string;
  title: string;
  likelihood: number;   // 0..1
  impact: number;       // 0..1
  score: number;        // derived
  mitigation?: string;
  createdAt: string;
}

// Additional domain types for the application

export interface Idea {
  id: string;
  projectId: string;
  briefJson: {
    company: Company;
    orgSize: OrgSize;
    // Additional brief fields can be added here
  };
  createdAt: string;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  status: "active" | "inactive" | "archived";
  createdAt: string;
}
