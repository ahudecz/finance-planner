# AGENT_GUIDE.md

> Put this file at the root of the repo and keep it up-to-date each sprint. Pin a one-paragraph summary from this file into Cursor **Custom Instructions** for persistent behavior.

---

## 0) How to use this guide (for humans & the coding agent)
- **Source of truth** for product strategy, current epic focus, and agent behavior rules.
- **Cursor** will read this file as part of project context. Keep it concise and structured.
- At the start of a session, paste the **Session Kickoff Primer** (below) into the chat to load context explicitly.

---

## 1) Product Strategy (PLACEHOLDER — fill in)
**Mission:** _e.g., “Help candidates discover employee‑friendly employers with transparent culture metrics.”_

**Target users:** _e.g., Job seekers (mid‑career), HR leaders, hiring managers._

**Problem we solve:**  
- P1:
- P2:
- P3:

**Unique value / differentiator:**  
- U1:
- U2:
- U3:

**Core outcomes / KPIs (max 5):**  
- Activation rate D7:
- Search-to-apply conversion:
- % listings with verified culture metrics:
- NPS / CSAT:
- Revenue KPI:

**Non-goals (out of scope for now):**  
- NG1:
- NG2:
- NG3:

**Success constraints & guardrails:**  
- Compliance / data privacy notes:
- Performance SLOs (p95 latency, error budget):
- Security posture (authZ/authN, RLS, secrets handling):

---

## 2) Current Epic & Sprint Context (update every sprint)
**Epic name:**  
**Sprint goal (1–2 sentences):**  
**Key user story (INVEST):**  
- As a … I want … so that …

**Acceptance criteria (Given/When/Then):**  
- Given … When … Then …
- Given … When … Then …

**In-scope:**  
- IS1
- IS2

**Out-of-scope:**  
- OOS1
- OOS2

**State of build (checklist):**
- [ ] Backend/API
- [ ] DB schema & migrations
- [ ] RLS / permissions
- [ ] Frontend UI/UX
- [ ] E2E tests
- [ ] Observability (logs/metrics/traces)
- [ ] Docs updated

**Definition of Done (DoD):**
- All ACs pass
- Tests added and passing (unit + integration/E2E where relevant)
- Security checks completed (see §5)
- Performance validated per SLOs
- Documentation updated
- Demo recorded (optional)

**Dependencies & risks:**  
- D1 (owner) — mitigation
- D2 (owner) — mitigation

---

## 3) Tech Stack & Conventions (fill & adjust)
**Languages/Frameworks:**  
- Frontend: _e.g., Next.js (App Router) + TypeScript_
- Backend: _e.g., Next API routes / Server Actions_
- DB: _e.g., Postgres (Supabase), Prisma/SQL_
- Search: _e.g., Pinecone / Postgres FTS_
- Background jobs: _e.g., Vercel Cron / n8n_

**Tooling:**  
- Package manager: _e.g., pnpm_
- Lint/format: ESLint + Prettier
- Tests: _e.g., Vitest/Jest + Playwright_
- Commit style: Conventional Commits (`feat:`, `fix:`, etc.)

**Project structure (sketch):**
```
/app              # routes & pages
/components      # UI components
/lib             # helpers, clients, schemas
/server          # server-only modules
/db              # migrations & queries
/tests           # unit/integration/e2e
/docs            # ADRs, decision logs, runbooks
AGENT_GUIDE.md
README.md
```
**Environment secrets:** keep only in `.env.local` / platform secrets. Never hardcode.

---

## 4) Agent Behavior Rules (non-negotiable)
1) **Clarify before coding** if any requirement is ambiguous (ask up to 3 targeted questions).  
2) **Propose a short plan** (bullets) before large changes. Wait for confirmation unless trivial.  
3) **Minimal, verifiable diffs**: output changes as file-by-file patches/snippets, not multi-hundred-line dumps.  
4) **Follow existing patterns**: match code style, folder structure, naming, and libraries found in the repo.  
5) **Check imports & paths**: Only use dependencies present in `package.json` or call out additions explicitly. Validate file paths exist or create them in the diff.  
6) **Type-safety first**: prefer TypeScript types, Zod/JSON Schema for runtime validation at boundaries.  
7) **Security**:  
   - No secrets in code. Use env vars and documented loaders.  
   - For data access, enforce **principle of least privilege** and (if Postgres) **RLS** by default.  
   - Sanitize/validate inputs; avoid SQL/NoSQL injection and XSS; handle authZ properly.  
8) **Performance**:  
   - Avoid N+1 queries; paginate by default.  
   - Use indexes where needed; call out expected complexity.  
   - Stream or chunk long-running work; don’t block the UI.  
9) **DX & tests**: Provide tests for new logic (happy + edge paths). Write helpful error messages and logs.  
10) **Explain trade-offs** briefly when choosing an approach; prefer clarity > cleverness.  
11) **Idempotent migrations & scripts**; include rollback notes.  
12) **Observability**: add log points/metrics for critical paths when relevant.

---

## 5) Security & Privacy Checklist (run mentally before proposing code)
- [ ] AuthZ: Who can call this? RBAC enforced?  
- [ ] Data exposure: Are we leaking PII/keys/tokens anywhere (logs, errors, URLs)?  
- [ ] RLS / row-level access: Enforced for multi-tenant or per-user data?  
- [ ] Input validation: Zod/Schema on all request/response boundaries?  
- [ ] Secrets: Loaded from env; never committed.  
- [ ] Dependency risk: New libs justified? Known, maintained, permissive license?  
- [ ] Output encoding: Escaping where user content reaches the UI/HTML?

---

## 6) API & Data Contracts (template)
**Endpoint name:** `/api/...`  
**Method:** GET/POST/PUT/DELETE  
**Request schema (Zod/JSON Schema):**
```ts
const Req = z.object({
  // fields
});
```
**Response schema:**
```ts
const Res = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().nullable(),
});
```
**Status codes:** 200, 400 (validation), 401/403 (auth), 404, 409 (conflict), 429 (rate), 5xx.  
**Rate limits:** _e.g., 60/min per user/IP._

---

## 7) Database & Migrations (template)
- Create migration files under `/db/migrations` with timestamp prefix.  
- Include **up** and **down** steps (rollback).  
- Document new indexes & expected query patterns.  
- If using Postgres RLS, include example policies:
```sql
-- Example RLS policy (adapt to your schema)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_owner_read"
  ON items FOR SELECT
  USING (auth.uid() = owner_id);
```
- Add seed data only for dev/test; never for prod.

---

## 8) UI/UX & Accessibility (template)
- Acceptance criteria cover empty/loading/error states.  
- Keyboard navigability and focus order checked.  
- Use semantic elements and ARIA where appropriate.  
- Copy is concise; labels & errors are human-friendly and actionable.  
- Internationalization-friendly (no hard-coded locale text where i18n is in scope).

---

## 9) Observability (template)
- Log meaningful events (start/end, errors, critical branches).  
- Consider adding metrics (duration, throughput, error rate) if infra supports it.  
- Include a brief runbook note for new critical flows in `/docs/runbooks/...`.

---

## 10) Workflow: Before/After Coding Checklists
**Before coding**
- [ ] Confirm epic/sprint goal & ACs.
- [ ] Clarify unknowns (post questions).
- [ ] Plan: steps, files to touch, risks.

**After coding**
- [ ] Run lint/tests locally (or CI).  
- [ ] Verify diffs are minimal and scoped.  
- [ ] Update docs/CHANGELOG if needed.  
- [ ] Add demo notes/screenshots if UI.

---

## 11) Commit & PR Templates
**Commit (Conventional Commits):**
```
feat(search): add vector query with pagination

- adds /api/search with validated input
- introduces index on embeddings(column)
- includes unit tests for query builder
```
**PR Description:**
- What & Why  
- Screenshots / Postman collection (if API)  
- How to test (steps)  
- Risks & mitigations  
- Rollback plan

---

## 12) Session Kickoff Primer (paste this into Cursor at the start)
> Use AGENT_GUIDE.md as primary context.  
> **Product Strategy:** see §1.  
> **Current Epic & Sprint:** see §2 (goal, ACs, scope).  
> **Behavior Rules:** follow §4 strictly (ask clarifying questions first, propose plan, minimal diffs, validate imports/paths, security & performance checklists).  
> **Deliverables:** code diffs + brief reasoning + tests + any migration scripts.  
> If requirements are unclear, ask targeted questions (max 3 at a time) before coding.

---

## 13) Quick Summary for Cursor Custom Instructions (copy/paste)
- Use `AGENT_GUIDE.md` as the behavior and context source.  
- Ask clarifying questions before coding if ambiguous (≤3).  
- Propose a brief plan, then output **minimal diffs** with verified imports/paths.  
- Enforce validation, authZ, and (if applicable) Postgres RLS.  
- Prefer TypeScript types + Zod at boundaries.  
- Add tests for new logic; document trade-offs briefly.  
- Follow repo structure & existing patterns; avoid new deps unless justified.
- Never hallucinate libraries; verify imports exist in package.json.

---

## 14) Decision Log (lightweight ADRs)
Record key architectural decisions in `/docs/adr/YYYYMMDD-title.md` with context, decision, alternatives, and consequence.

---

## 15) Open Questions (to resolve before/while implementing)
- Q1:
- Q2:
- Q3:

---

_Keep this guide short, current, and opinionated. Link to deeper docs from here as needed._
