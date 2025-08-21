# Budget Isolation from Risks Storage

## Overview

This document confirms that the new risks storage system does not affect budget calculations. Budget totals are calculated exclusively from financial tables (`proposal_items` and `estimates`), while risks are stored separately in the `risks` table with no financial fields.

## Database Schema Separation

### Financial Tables (Budget Calculations)

#### `proposal_items` Table
```sql
CREATE TABLE proposal_items (
  id uuid PRIMARY KEY,
  proposal_id uuid REFERENCES proposals(id),
  kind text NOT NULL, -- budget | timeline | role-internal | role-external | tech | security | risk
  content_json jsonb NOT NULL,
  cost_num numeric,      -- ✓ FINANCIAL FIELD
  effort_days numeric,   -- ✓ FINANCIAL FIELD  
  confidence numeric,
  accepted_bool boolean,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

#### `estimates` Table
```sql
CREATE TABLE estimates (
  id uuid PRIMARY KEY,
  idea_id uuid REFERENCES ideas(id),
  capex numeric,           -- ✓ FINANCIAL FIELD
  opex_mo numeric,         -- ✓ FINANCIAL FIELD
  cloud_cost_mo numeric,   -- ✓ FINANCIAL FIELD
  vendor_cost_mo numeric,  -- ✓ FINANCIAL FIELD
  confidence_pct numeric,
  created_at timestamptz DEFAULT now()
);
```

### Non-Financial Tables (Risk Management)

#### `risks` Table
```sql
CREATE TABLE risks (
  id uuid PRIMARY KEY,
  idea_id uuid REFERENCES ideas(id),
  title text NOT NULL,
  likelihood text NOT NULL,  -- Low, Medium, High
  impact text NOT NULL,      -- Low, Medium, High
  score numeric NOT NULL DEFAULT 0,
  mitigation text,
  created_at timestamptz DEFAULT now()
);
-- ❌ NO FINANCIAL FIELDS (no cost_num, capex, opex_mo, etc.)
```

## Budget Selector Functions

### Implementation (`src/lib/budget/selectors.ts`)

#### `selectCapex(ideaId: string): Promise<number>`
- **Source**: `proposal_items` table only
- **Filter**: `kind = 'budget'` AND `accepted_bool = true` AND `cost_num IS NOT NULL`
- **Calculation**: `SUM(cost_num)`
- **Excludes**: risks, security_findings, artifacts, audit_log

#### `selectOpexMonthly(ideaId: string): Promise<number>`  
- **Source**: `proposal_items` table only
- **Filter**: `kind IN ('role-internal', 'role-external', 'tech')` AND `accepted_bool = true`
- **Calculation**: `SUM(cost_num)` for recurring operational costs
- **Excludes**: risks, security_findings, artifacts, audit_log

#### `selectLatestEstimate(ideaId: string): Promise<EstimateSnapshot | null>`
- **Source**: `estimates` table only
- **Order**: `created_at DESC LIMIT 1`
- **Returns**: Pre-calculated CAPEX, OPEX, cloud costs, vendor costs
- **Excludes**: risks, security_findings, artifacts, audit_log

#### `verifyBudgetIsolation(ideaId: string): Promise<boolean>`
- **Purpose**: Confirms budget calculations are unaffected by risks
- **Method**: Calculates budgets before/after checking risks count
- **Verification**: Budget totals remain identical regardless of risk data

## Unit Tests

### Test Coverage (`src/__tests__/budget-isolation-simple.test.ts`)

1. **Schema Validation Tests**
   - ✅ Confirms risks table has no financial fields
   - ✅ Confirms proposal_items has cost_num and effort_days
   - ✅ Confirms estimates has capex, opex_mo, etc.

2. **Budget Calculation Logic Tests**
   - ✅ Documents CAPEX = SUM(proposal_items.cost_num WHERE kind='budget')
   - ✅ Documents OPEX = SUM(proposal_items.cost_num WHERE kind IN roles)
   - ✅ Verifies exclusion of non-financial tables

3. **Risk Storage Isolation Tests**
   - ✅ Simulates budget calculation before/after risk generation
   - ✅ Confirms adding risks doesn't change budget math
   - ✅ Documents separate data flows for budget vs risk calculations

4. **API Endpoint Separation Tests**
   - ✅ Confirms budget endpoints don't reference risks
   - ✅ Confirms risk endpoints don't affect budget calculations

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode  
npm run test:coverage      # Coverage report
```

## API Endpoint Separation

### Budget APIs (Future Implementation)
```
GET /api/budget/capex?ideaId=...     -> selectCapex()
GET /api/budget/opex?ideaId=...      -> selectOpexMonthly() 
GET /api/budget/totals?ideaId=...    -> selectBudgetTotals()
GET /api/estimates?ideaId=...        -> selectLatestEstimate()
```

### Risk APIs (Currently Implemented)
```
GET /api/risks?ideaId=...            -> Fetch risks by idea
POST /api/risks/generate             -> Generate new risks
```

**Key Point**: Risk APIs operate on the `risks` table exclusively and have no access to financial data or budget calculations.

## Data Flow Verification

### Budget Calculation Flow
```
1. Query proposal_items WHERE kind='budget' AND accepted_bool=true
2. SUM(cost_num) -> CAPEX total
3. Query proposal_items WHERE kind IN roles AND accepted_bool=true  
4. SUM(cost_num) -> OPEX monthly total
5. Query estimates ORDER BY created_at DESC LIMIT 1 -> Latest estimates
6. Combine/prefer estimate data over calculated values
```

### Risk Generation Flow  
```
1. Query ideas.brief_json -> Company context
2. Apply risk templates based on company size/type
3. Calculate risk scores (likelihood × impact × 10)
4. INSERT INTO risks table -> Store risk assessments
5. Return generated risks for UI display
```

**Isolation Confirmed**: These flows operate on completely separate tables with no shared financial data.

## Conclusion

✅ **Budget calculations are fully isolated from risks storage**

- Budget functions only query `proposal_items` and `estimates` tables
- Risk functions only query/modify the `risks` table  
- No financial fields exist in the `risks` table
- Unit tests verify this separation programmatically
- API endpoints maintain clear separation of concerns

The new risk storage system enhances the application's risk management capabilities without affecting existing or future budget calculations.

## Future Enhancements

1. **Budget APIs**: Implement REST endpoints using the selector functions
2. **Budget UI**: Create components to display CAPEX/OPEX totals
3. **Integration Tests**: Add end-to-end tests with real Supabase data
4. **Performance**: Add database indexes for budget queries
5. **Validation**: Add business rules for budget approval workflows
