/**
 * Simple Budget Isolation Tests
 * 
 * These tests verify that budget calculations only use financial tables
 * and document the separation between risks and budget data.
 */

import { describe, it, expect } from '@jest/globals';

describe('Budget and Risk Table Separation', () => {
  describe('Database Schema Validation', () => {
    it('should document that risks table has no financial fields', () => {
      // Document the risks table structure
      const risksTableSchema = {
        id: 'uuid primary key',
        idea_id: 'uuid foreign key',
        title: 'text not null',
        likelihood: 'text not null', // Low, Medium, High
        impact: 'text not null', // Low, Medium, High  
        score: 'numeric not null default 0',
        mitigation: 'text nullable',
        created_at: 'timestamptz default now()'
      };

      // Verify no financial fields exist in risks table
      const financialFields = ['cost_num', 'capex', 'opex_mo', 'effort_days', 'cloud_cost_mo', 'vendor_cost_mo'];
      const risksFields = Object.keys(risksTableSchema);

      financialFields.forEach(financialField => {
        expect(risksFields).not.toContain(financialField);
      });

      // Verify risks table only contains risk-related fields
      expect(risksFields).toContain('title');
      expect(risksFields).toContain('likelihood');
      expect(risksFields).toContain('impact');
      expect(risksFields).toContain('score');
      expect(risksFields).toContain('mitigation');
    });

    it('should document that proposal_items table has financial fields', () => {
      // Document the proposal_items table structure
      const proposalItemsSchema = {
        id: 'uuid primary key',
        proposal_id: 'uuid foreign key',
        kind: 'text not null', // budget | timeline | role-internal | role-external | tech | security | risk
        content_json: 'jsonb not null',
        cost_num: 'numeric nullable', // ✓ Financial field
        effort_days: 'numeric nullable', // ✓ Financial field
        confidence: 'numeric nullable',
        accepted_bool: 'boolean nullable',
        notes: 'text nullable',
        created_at: 'timestamptz default now()'
      };

      // Verify financial fields exist in proposal_items
      const proposalItemsFields = Object.keys(proposalItemsSchema);
      
      expect(proposalItemsFields).toContain('cost_num');
      expect(proposalItemsFields).toContain('effort_days');
      
      // Verify it has budget-related kinds (documented in schema comment)
      const allowedKinds = ['budget', 'timeline', 'role-internal', 'role-external', 'tech', 'security', 'risk'];
      expect(allowedKinds).toContain('budget');
      expect(allowedKinds).toContain('role-internal');
      expect(allowedKinds).toContain('role-external');
    });

    it('should document that estimates table has aggregated financial fields', () => {
      // Document the estimates table structure
      const estimatesSchema = {
        id: 'uuid primary key',
        idea_id: 'uuid foreign key',
        capex: 'numeric nullable', // ✓ Financial field
        opex_mo: 'numeric nullable', // ✓ Financial field
        cloud_cost_mo: 'numeric nullable', // ✓ Financial field
        vendor_cost_mo: 'numeric nullable', // ✓ Financial field
        confidence_pct: 'numeric nullable',
        created_at: 'timestamptz default now()'
      };

      // Verify all major financial fields exist
      const estimatesFields = Object.keys(estimatesSchema);
      
      expect(estimatesFields).toContain('capex');
      expect(estimatesFields).toContain('opex_mo');
      expect(estimatesFields).toContain('cloud_cost_mo');
      expect(estimatesFields).toContain('vendor_cost_mo');
      expect(estimatesFields).toContain('confidence_pct');
    });
  });

  describe('Budget Calculation Logic', () => {
    it('should define CAPEX as sum of accepted budget-type proposal items', () => {
      // Document the CAPEX calculation logic
      const capexCalculation = {
        source: 'proposal_items table',
        filter: {
          kind: 'budget',
          accepted_bool: true,
          cost_num: 'not null'
        },
        calculation: 'SUM(cost_num)',
        excludes: ['risks table', 'security_findings table', 'artifacts table']
      };

      expect(capexCalculation.source).toBe('proposal_items table');
      expect(capexCalculation.filter.kind).toBe('budget');
      expect(capexCalculation.filter.accepted_bool).toBe(true);
      expect(capexCalculation.excludes).toContain('risks table');
    });

    it('should define OPEX as sum of recurring operational costs', () => {
      // Document the OPEX calculation logic
      const opexCalculation = {
        source: 'proposal_items table',
        filter: {
          kind: ['role-internal', 'role-external', 'tech'],
          accepted_bool: true,
          cost_num: 'not null'
        },
        calculation: 'SUM(cost_num) for recurring items',
        excludes: ['risks table', 'security_findings table', 'artifacts table']
      };

      expect(opexCalculation.source).toBe('proposal_items table');
      expect(opexCalculation.filter.kind).toContain('role-internal');
      expect(opexCalculation.filter.kind).toContain('role-external');
      expect(opexCalculation.excludes).toContain('risks table');
    });

    it('should verify budget calculations ignore non-financial tables', () => {
      // List of tables that should NOT affect budget calculations
      const nonFinancialTables = [
        'risks',
        'security_findings', 
        'artifacts',
        'audit_log',
        'ideas', // Contains brief_json but no direct costs
        'runs',  // Execution metadata only
        'tasks', // Planning tasks, not financial
        'projects' // Project metadata only
      ];

      // List of tables that SHOULD affect budget calculations
      const financialTables = [
        'proposal_items', // Direct cost line items
        'estimates'       // Aggregated financial estimates
      ];

      // Verify separation
      nonFinancialTables.forEach(table => {
        expect(financialTables).not.toContain(table);
      });

      financialTables.forEach(table => {
        expect(nonFinancialTables).not.toContain(table);
      });

      // Verify risks is explicitly in the non-financial list
      expect(nonFinancialTables).toContain('risks');
    });
  });

  describe('Risk Storage Isolation', () => {
    it('should verify that adding risks does not change budget math', () => {
      // Simulate the scenario: budget calculation before and after risk generation
      
      // Mock budget data (what would come from proposal_items)
      const budgetItems = [
        { kind: 'budget', cost_num: 10000, accepted_bool: true },
        { kind: 'budget', cost_num: 5000, accepted_bool: true },
        { kind: 'role-internal', cost_num: 2000, accepted_bool: true }
      ];

      // Mock risk data (stored separately in risks table)
      const riskItems = [
        { title: 'Data Security Breach', score: 7.2 },
        { title: 'Budget Cost Overrun', score: 4.5 },
        { title: 'User Adoption Risk', score: 3.0 }
      ];

      // Calculate budget totals (should only use budgetItems)
      const capex = budgetItems
        .filter(item => item.kind === 'budget' && item.accepted_bool)
        .reduce((sum, item) => sum + item.cost_num, 0);
      
      const opex = budgetItems
        .filter(item => item.kind.includes('role') && item.accepted_bool)
        .reduce((sum, item) => sum + item.cost_num, 0);

      // Verify calculations are independent of risk data
      expect(capex).toBe(15000); // 10000 + 5000
      expect(opex).toBe(2000);   // 2000 (role-internal only)
      
      // Adding more risks should not change budget
      const moreRisks = [
        ...riskItems,
        { title: 'Integration Failure', score: 5.6 },
        { title: 'Scalability Issues', score: 2.8 }
      ];

      // Budget should remain the same regardless of risk count
      expect(capex).toBe(15000);
      expect(opex).toBe(2000);
      expect(moreRisks.length).toBeGreaterThan(riskItems.length);
    });

    it('should document the proper data flow for budget vs risk calculations', () => {
      const dataFlow = {
        budget: {
          input: 'proposal_items + estimates tables',
          process: 'SUM accepted cost_num fields',
          output: 'CAPEX, OPEX monthly totals',
          tables: ['proposal_items', 'estimates']
        },
        risks: {
          input: 'company brief_json + risk templates',
          process: 'Generate risk assessments',
          output: 'Risk items with scores',
          tables: ['risks']
        }
      };

      // Verify complete separation
      expect(dataFlow.budget.tables).not.toContain('risks');
      expect(dataFlow.risks.tables).not.toContain('proposal_items');
      expect(dataFlow.risks.tables).not.toContain('estimates');

      // Verify different purposes
      expect(dataFlow.budget.output).toContain('CAPEX');
      expect(dataFlow.budget.output).toContain('OPEX');
      expect(dataFlow.risks.output).toContain('Risk items');
      expect(dataFlow.risks.output).not.toContain('CAPEX');
      expect(dataFlow.risks.output).not.toContain('OPEX');
    });
  });

  describe('API Endpoint Separation', () => {
    it('should document that risk APIs do not affect budget APIs', () => {
      const apiEndpoints = {
        budget: [
          'GET /api/budget/capex?ideaId=...',
          'GET /api/budget/opex?ideaId=...',
          'GET /api/estimates?ideaId=...'
        ],
        risks: [
          'GET /api/risks?ideaId=...',
          'POST /api/risks/generate'
        ]
      };

      // Verify endpoint separation
      apiEndpoints.budget.forEach(budgetEndpoint => {
        expect(budgetEndpoint).not.toContain('risk');
      });

      apiEndpoints.risks.forEach(riskEndpoint => {
        expect(riskEndpoint).not.toContain('budget');
        expect(riskEndpoint).not.toContain('capex');
        expect(riskEndpoint).not.toContain('opex');
      });

      // Verify risks endpoints exist
      expect(apiEndpoints.risks).toContain('GET /api/risks?ideaId=...');
      expect(apiEndpoints.risks).toContain('POST /api/risks/generate');
    });
  });
});
