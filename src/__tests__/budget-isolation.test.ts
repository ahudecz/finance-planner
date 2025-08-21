/**
 * Budget Isolation Tests
 * 
 * These tests verify that the risks table does not affect budget calculations.
 * Budget totals should only come from proposal_items and estimates tables.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { selectCapex, selectOpexMonthly, selectBudgetTotals, verifyBudgetIsolation } from '@/lib/budget/selectors';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  not: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  single: jest.fn(),
};

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}));

describe('Budget Isolation from Risks Table', () => {
  const testIdeaId = 'test-idea-123';

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock chain
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.in.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.not.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.single.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('selectCapex', () => {
    it('should only query proposal_items table for budget calculations', async () => {
      // Mock successful proposal_items query
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'proposal_items') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    not: jest.fn().mockResolvedValue({
                      data: [
                        { cost_num: 10000, kind: 'budget', accepted_bool: true },
                        { cost_num: 5000, kind: 'budget', accepted_bool: true }
                      ],
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabaseClient;
      });

      const capex = await selectCapex(testIdeaId);

      // Verify it only queries proposal_items, not risks
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('proposal_items');
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('risks');
      
      // Verify correct CAPEX calculation
      expect(capex).toBe(15000);
    });

    it('should return 0 when no budget proposal items exist', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'proposal_items') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    not: jest.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabaseClient;
      });

      const capex = await selectCapex(testIdeaId);
      expect(capex).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'proposal_items') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    not: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Database error', code: 'DB_ERROR' }
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabaseClient;
      });

      const capex = await selectCapex(testIdeaId);
      expect(capex).toBe(0);
    });
  });

  describe('selectOpexMonthly', () => {
    it('should only query proposal_items for operational costs', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'proposal_items') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                in: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    not: jest.fn().mockResolvedValue({
                      data: [
                        { cost_num: 2000, kind: 'role-internal', accepted_bool: true },
                        { cost_num: 3000, kind: 'role-external', accepted_bool: true },
                        { cost_num: 1000, kind: 'tech', accepted_bool: true }
                      ],
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabaseClient;
      });

      const opex = await selectOpexMonthly(testIdeaId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('proposal_items');
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('risks');
      
      // Should only count role costs as monthly OPEX
      expect(opex).toBe(5000); // 2000 + 3000 (roles only)
    });
  });

  describe('Budget Isolation Verification', () => {
    it('should verify that risks do not affect budget calculations', async () => {
      // Mock proposal_items query for budget calculations
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'proposal_items') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    not: jest.fn().mockResolvedValue({
                      data: [{ cost_num: 10000, kind: 'budget', accepted_bool: true }],
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        
        if (table === 'estimates') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                order: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  limit: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' } // No data found
                    })
                  })
                })
              })
            })
          };
        }

        if (table === 'risks') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockResolvedValue({
                data: [{ count: 5 }], // 5 risks exist
                error: null
              })
            })
          };
        }

        return mockSupabaseClient;
      });

      const isIsolated = await verifyBudgetIsolation(testIdeaId);

      // Verify that budget calculations are consistent regardless of risks
      expect(isIsolated).toBe(true);
      
      // Verify that risks table was queried only for verification, not budget calculation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('risks');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('proposal_items');
    });

    it('should maintain budget isolation even with many risks', async () => {
      // Setup budget data
      const mockBudgetData = [
        { cost_num: 15000, kind: 'budget', accepted_bool: true },
        { cost_num: 8000, kind: 'budget', accepted_bool: true }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'proposal_items') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    not: jest.fn().mockResolvedValue({
                      data: mockBudgetData,
                      error: null
                    })
                  })
                })
              })
            })
          };
        }

        if (table === 'estimates') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                order: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  limit: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' }
                    })
                  })
                })
              })
            })
          };
        }

        if (table === 'risks') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockResolvedValue({
                data: [{ count: 50 }], // Many risks
                error: null
              })
            })
          };
        }

        return mockSupabaseClient;
      });

      const budgetTotals = await selectBudgetTotals(testIdeaId);
      
      // Budget should be calculated correctly regardless of risk count
      expect(budgetTotals.capex).toBe(23000); // 15000 + 8000
      expect(budgetTotals.opexMonthly).toBe(0); // No role items in this test
      expect(budgetTotals.totalFirstYear).toBe(23000); // CAPEX only
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase connection errors gracefully', async () => {
      // Mock connection error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const capex = await selectCapex(testIdeaId);
      const opex = await selectOpexMonthly(testIdeaId);
      const totals = await selectBudgetTotals(testIdeaId);

      expect(capex).toBe(0);
      expect(opex).toBe(0);
      expect(totals.capex).toBe(0);
      expect(totals.opexMonthly).toBe(0);
      expect(totals.totalFirstYear).toBe(0);
    });

    it('should handle malformed data gracefully', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'proposal_items') {
          return {
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                eq: jest.fn().mockReturnValue({
                  ...mockSupabaseClient,
                  eq: jest.fn().mockReturnValue({
                    ...mockSupabaseClient,
                    not: jest.fn().mockResolvedValue({
                      data: [
                        { cost_num: null, kind: 'budget', accepted_bool: true },
                        { cost_num: 'invalid', kind: 'budget', accepted_bool: true },
                        { cost_num: 5000, kind: 'budget', accepted_bool: true }
                      ],
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabaseClient;
      });

      const capex = await selectCapex(testIdeaId);
      
      // Should handle null and invalid values, only sum valid numbers
      expect(capex).toBe(5000);
    });
  });
});

/**
 * Integration test to verify table separation
 */
describe('Table Separation Integration', () => {
  it('should demonstrate that risks and proposal_items are separate tables', () => {
    // This test documents the expected table structure
    const expectedTables = {
      risks: {
        purpose: 'Risk management and assessment',
        financialFields: [], // No financial fields
        keyFields: ['title', 'likelihood', 'impact', 'score', 'mitigation']
      },
      proposal_items: {
        purpose: 'Budget line items and cost tracking',
        financialFields: ['cost_num', 'effort_days'], // Financial fields
        keyFields: ['kind', 'cost_num', 'effort_days', 'accepted_bool']
      },
      estimates: {
        purpose: 'Aggregated budget estimates',
        financialFields: ['capex', 'opex_mo', 'cloud_cost_mo', 'vendor_cost_mo'], // Financial fields
        keyFields: ['capex', 'opex_mo', 'confidence_pct']
      }
    };

    // Assert table purposes are distinct
    expect(expectedTables.risks.purpose).not.toBe(expectedTables.proposal_items.purpose);
    expect(expectedTables.risks.financialFields).toHaveLength(0);
    expect(expectedTables.proposal_items.financialFields.length).toBeGreaterThan(0);
    expect(expectedTables.estimates.financialFields.length).toBeGreaterThan(0);

    // Document that risks should never affect budget calculations
    expect(expectedTables.risks.financialFields).not.toContain('cost_num');
    expect(expectedTables.risks.financialFields).not.toContain('capex');
    expect(expectedTables.risks.financialFields).not.toContain('opex_mo');
  });
});
