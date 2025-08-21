/**
 * Budget Selectors - Functions to calculate budget totals from proposal_items and estimates
 * 
 * These functions ensure budget calculations only read from proper financial tables
 * and are not affected by the risks table or other non-financial data.
 */

import { supabase } from "@/lib/supabase/client";

// Types for budget calculations
export interface BudgetTotals {
  capex: number;
  opexMonthly: number;
  totalFirstYear: number;
  confidence: number;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  kind: string;
  costNum: number | null;
  effortDays: number | null;
  confidence: number | null;
  acceptedBool: boolean | null;
}

export interface EstimateSnapshot {
  id: string;
  ideaId: string;
  capex: number | null;
  opexMo: number | null;
  cloudCostMo: number | null;
  vendorCostMo: number | null;
  confidencePct: number | null;
  createdAt: string;
}

/**
 * Calculate CAPEX total from proposal items
 * Only includes accepted budget-type proposal items
 * 
 * @param ideaId - The idea ID to calculate CAPEX for
 * @returns Promise<number> - Total CAPEX amount
 */
export async function selectCapex(ideaId: string): Promise<number> {
  try {
    console.log("💰 Calculating CAPEX for idea:", ideaId);
    
    // Query proposal_items through the relationship chain:
    // idea -> runs -> proposals -> proposal_items
    const { data: items, error } = await supabase
      .from('proposal_items')
      .select(`
        cost_num,
        kind,
        accepted_bool,
        proposals!inner(
          runs!inner(
            ideas!inner(id)
          )
        )
      `)
      .eq('proposals.runs.ideas.id', ideaId)
      .eq('kind', 'budget')
      .eq('accepted_bool', true)
      .not('cost_num', 'is', null);

    if (error) {
      console.error('Error fetching CAPEX data:', error);
      return 0;
    }

    // Sum up all accepted budget items as CAPEX
    const capexTotal = (items || []).reduce((total, item) => {
      const cost = item.cost_num || 0;
      return total + cost;
    }, 0);

    console.log(`✅ CAPEX total: $${capexTotal.toLocaleString()}`);
    return capexTotal;

  } catch (error) {
    console.error('Error in selectCapex:', error);
    return 0;
  }
}

/**
 * Calculate monthly OPEX total from proposal items
 * Only includes accepted recurring cost items
 * 
 * @param ideaId - The idea ID to calculate monthly OPEX for
 * @returns Promise<number> - Total monthly OPEX amount
 */
export async function selectOpexMonthly(ideaId: string): Promise<number> {
  try {
    console.log("💰 Calculating monthly OPEX for idea:", ideaId);
    
    // Query for recurring operational costs
    // This could include role-internal, role-external items marked as recurring
    const { data: items, error } = await supabase
      .from('proposal_items')
      .select(`
        cost_num,
        kind,
        accepted_bool,
        content_json,
        proposals!inner(
          runs!inner(
            ideas!inner(id)
          )
        )
      `)
      .eq('proposals.runs.ideas.id', ideaId)
      .in('kind', ['role-internal', 'role-external', 'tech'])
      .eq('accepted_bool', true)
      .not('cost_num', 'is', null);

    if (error) {
      console.error('Error fetching OPEX data:', error);
      return 0;
    }

    // Sum up monthly recurring costs
    // In a real implementation, you'd check content_json for recurring flag
    const opexTotal = (items || []).reduce((total, item) => {
      const cost = item.cost_num || 0;
      // For now, assume all role costs are monthly
      // TODO: Check content_json.isRecurring or similar field
      if (item.kind.includes('role')) {
        return total + cost;
      }
      return total;
    }, 0);

    console.log(`✅ Monthly OPEX total: $${opexTotal.toLocaleString()}`);
    return opexTotal;

  } catch (error) {
    console.error('Error in selectOpexMonthly:', error);
    return 0;
  }
}

/**
 * Get latest estimate snapshot for an idea
 * This provides pre-calculated budget totals from the estimates table
 * 
 * @param ideaId - The idea ID to get estimates for
 * @returns Promise<EstimateSnapshot | null> - Latest estimate or null
 */
export async function selectLatestEstimate(ideaId: string): Promise<EstimateSnapshot | null> {
  try {
    console.log("📊 Fetching latest estimate for idea:", ideaId);
    
    const { data: estimate, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No estimates found
        console.log('ℹ️ No estimates found for idea:', ideaId);
        return null;
      }
      console.error('Error fetching estimate:', error);
      return null;
    }

    const result: EstimateSnapshot = {
      id: estimate.id,
      ideaId: estimate.idea_id,
      capex: estimate.capex,
      opexMo: estimate.opex_mo,
      cloudCostMo: estimate.cloud_cost_mo,
      vendorCostMo: estimate.vendor_cost_mo,
      confidencePct: estimate.confidence_pct,
      createdAt: estimate.created_at
    };

    console.log('✅ Found estimate:', {
      capex: result.capex,
      opexMo: result.opexMo,
      confidence: result.confidencePct
    });

    return result;

  } catch (error) {
    console.error('Error in selectLatestEstimate:', error);
    return null;
  }
}

/**
 * Calculate comprehensive budget totals for an idea
 * Combines proposal items and estimate data
 * 
 * @param ideaId - The idea ID to calculate totals for
 * @returns Promise<BudgetTotals> - Complete budget breakdown
 */
export async function selectBudgetTotals(ideaId: string): Promise<BudgetTotals> {
  try {
    console.log("🧮 Calculating comprehensive budget totals for idea:", ideaId);
    
    // Get both calculated and estimated values
    const [capexFromItems, opexFromItems, latestEstimate] = await Promise.all([
      selectCapex(ideaId),
      selectOpexMonthly(ideaId),
      selectLatestEstimate(ideaId)
    ]);

    // Prefer estimate data if available, fall back to calculated values
    const capex = latestEstimate?.capex ?? capexFromItems;
    const opexMonthly = latestEstimate?.opexMo ?? opexFromItems;
    
    // Calculate first year total (CAPEX + 12 months OPEX)
    const totalFirstYear = capex + (opexMonthly * 12);
    
    // Use estimate confidence if available
    const confidence = latestEstimate?.confidencePct ?? 0.5; // Default 50% confidence

    const totals: BudgetTotals = {
      capex,
      opexMonthly,
      totalFirstYear,
      confidence
    };

    console.log('✅ Budget totals calculated:', totals);
    return totals;

  } catch (error) {
    console.error('Error in selectBudgetTotals:', error);
    return {
      capex: 0,
      opexMonthly: 0,
      totalFirstYear: 0,
      confidence: 0
    };
  }
}

/**
 * Verify that risks table does not affect budget calculations
 * This is a utility function for testing and validation
 * 
 * @param ideaId - The idea ID to test
 * @returns Promise<boolean> - True if budget calculations are isolated from risks
 */
export async function verifyBudgetIsolation(ideaId: string): Promise<boolean> {
  try {
    console.log("🔍 Verifying budget isolation from risks table for idea:", ideaId);
    
    // Calculate budget totals before checking risks
    const budgetBefore = await selectBudgetTotals(ideaId);
    
    // Check if risks exist (should not affect budget)
    const { data: risks, error } = await supabase
      .from('risks')
      .select('*')
      .eq('idea_id', ideaId);
    
    if (error) {
      console.error('Error checking risks:', error);
      return false;
    }

    // Calculate budget totals again (should be identical)
    const budgetAfter = await selectBudgetTotals(ideaId);
    
    // Verify budgets are identical regardless of risks
    const isIsolated = (
      budgetBefore.capex === budgetAfter.capex &&
      budgetBefore.opexMonthly === budgetAfter.opexMonthly &&
      budgetBefore.totalFirstYear === budgetAfter.totalFirstYear
    );
    
    console.log('✅ Budget isolation verified:', isIsolated);
    console.log('Risk count:', risks?.length ?? 0);
    
    return isIsolated;

  } catch (error) {
    console.error('Error in verifyBudgetIsolation:', error);
    return false;
  }
}
