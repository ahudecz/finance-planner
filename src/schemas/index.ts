/**
 * Zod validation schemas for Finance Planner
 */

import { z } from "zod";

// Organization size schema for widget #2
export const orgSizeSchema = z.enum([
  "<20",
  "20–200", 
  "200–1k",
  "1k–10k",
  ">10k",
  "Unknown"
]);

// Company schema for widget #1
export const companySchema = z.object({
  name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(120, "Company name must be less than 120 characters")
    .regex(/[A-Za-z0-9].*/, "Invalid company name format"),
  domain: z
    .string()
    .url("Invalid domain URL format")
    .optional()
    .or(z.literal("")), // Allow empty string to be treated as undefined
  linkedinUrl: z
    .string()
    .url("Invalid LinkedIn URL format")
    .optional()
    .or(z.literal("")), // Allow empty string to be treated as undefined
  privacyRedaction: z.boolean().default(false),
});

// Risk item schema for widget #7
export const riskSchema = z.object({
  title: z
    .string()
    .min(3, "Risk title must be at least 3 characters")
    .max(140, "Risk title must be less than 140 characters"),
  likelihood: z
    .number()
    .min(0, "Likelihood must be between 0 and 1")
    .max(1, "Likelihood must be between 0 and 1"),
  impact: z
    .number()
    .min(0, "Impact must be between 0 and 1")
    .max(1, "Impact must be between 0 and 1"),
  mitigation: z
    .string()
    .min(3, "Mitigation must be at least 3 characters")
    .max(300, "Mitigation must be less than 300 characters")
    .optional(),
});

// Complete risk item schema with all fields (for database operations)
export const riskItemSchema = riskSchema.extend({
  id: z.string().uuid("Invalid risk ID format"),
  ideaId: z.string().uuid("Invalid idea ID format"),
  score: z.number().min(0).max(1), // Derived from likelihood * impact
  createdAt: z.string().datetime("Invalid date format"),
});

// Idea brief schema combining company and org size
export const ideaBriefSchema = z.object({
  company: companySchema,
  orgSize: orgSizeSchema,
});

// Form schemas for validation in components
export const ideaBriefFormSchema = ideaBriefSchema.extend({
  // Additional form-specific fields can be added here
});

// API request/response schemas
export const createRiskRequestSchema = riskSchema;
export const updateRiskRequestSchema = riskSchema.partial();

export const generateRisksRequestSchema = z.object({
  ideaId: z.string().uuid("Invalid idea ID format"),
  count: z.number().min(1).max(10).default(5),
});

// Type inference helpers
export type OrgSize = z.infer<typeof orgSizeSchema>;
export type Company = z.infer<typeof companySchema>;
export type Risk = z.infer<typeof riskSchema>;
export type RiskItem = z.infer<typeof riskItemSchema>;
export type IdeaBrief = z.infer<typeof ideaBriefSchema>;
export type IdeaBriefForm = z.infer<typeof ideaBriefFormSchema>;

// Validation helper functions
export const validateCompany = (data: unknown) => companySchema.safeParse(data);
export const validateOrgSize = (data: unknown) => orgSizeSchema.safeParse(data);
export const validateRisk = (data: unknown) => riskSchema.safeParse(data);
export const validateIdeaBrief = (data: unknown) => ideaBriefSchema.safeParse(data);
