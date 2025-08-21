/**
 * Helper functions for extracting data from idea brief_json
 */

import { Company, OrgSize } from "@/types/domain";
import { companySchema, orgSizeSchema } from "@/schemas";

/**
 * Extract Company information from brief_json
 * @param brief - The brief_json object from ideas table
 * @returns Company object or undefined if not found/invalid
 */
export function getCompany(brief: unknown): Company | undefined {
  if (!brief || typeof brief !== 'object') {
    return undefined;
  }

  const company = (brief as Record<string, unknown>).company;
  if (!company || typeof company !== 'object') {
    return undefined;
  }

  // Validate the company data using Zod schema
  const result = companySchema.safeParse(company);
  if (!result.success) {
    console.warn("Invalid company data in brief_json:", result.error);
    return undefined;
  }

  return result.data;
}

/**
 * Extract Organization Size from brief_json
 * @param brief - The brief_json object from ideas table
 * @returns OrgSize value, defaults to "Unknown" if not found/invalid
 */
export function getOrgSize(brief: unknown): OrgSize {
  if (!brief || typeof brief !== 'object') {
    return "Unknown";
  }

  // Check both size_band (legacy) and orgSize (new) fields
  const briefObj = brief as Record<string, unknown>;
  const sizeValue = briefObj.size_band || briefObj.orgSize;
  if (!sizeValue) {
    return "Unknown";
  }

  // Validate the org size using Zod schema
  const result = orgSizeSchema.safeParse(sizeValue);
  if (!result.success) {
    console.warn("Invalid org size in brief_json:", result.error);
    return "Unknown";
  }

  return result.data;
}

/**
 * Create a brief_json object from form data
 * @param company - Company information
 * @param orgSize - Organization size
 * @returns Structured brief_json object
 */
export function createBriefJson(company: Company, orgSize: OrgSize) {
  return {
    company: {
      name: company.name,
      domain: company.domain || undefined,
      linkedinUrl: company.linkedinUrl || undefined,
      privacyRedaction: company.privacyRedaction || false,
    },
    size_band: orgSize, // Store as size_band for spec compliance
    orgSize: orgSize,   // Also store as orgSize for future compatibility
  };
}
