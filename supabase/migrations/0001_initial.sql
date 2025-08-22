-- Enable extensions (if needed)
create extension if not exists pgcrypto;

-- Function to update updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- Ideas (one or more per project)
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  brief_json jsonb not null,
  created_at timestamptz default now()
);

-- Runs (agent runs per idea)
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  status text default 'completed',
  model_meta jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- Tasks (planning tasks)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  title text not null,
  type text not null,
  depends_on uuid[] default '{}',
  status text default 'done',
  tool_used text,
  output_json jsonb,
  created_at timestamptz default now()
);

-- Proposals (versioned)
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  version int not null,
  status text default 'draft',
  created_at timestamptz default now()
);

-- Proposal items (reviewable rows)
create table if not exists proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  kind text not null, -- budget | timeline | role-internal | role-external | tech | security | risk
  content_json jsonb not null,
  cost_num numeric,
  effort_days numeric,
  confidence numeric,
  accepted_bool boolean,
  notes text,
  created_at timestamptz default now()
);

-- Estimates snapshot per idea
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  capex numeric,
  opex_mo numeric,
  cloud_cost_mo numeric,
  vendor_cost_mo numeric,
  confidence_pct numeric,
  created_at timestamptz default now()
);

-- Security findings per idea
create table if not exists security_findings (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  control text not null,
  status text not null,
  recommendation text,
  risk_level text,
  created_at timestamptz default now()
);

-- Risks per idea
create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  title text not null,
  likelihood text not null, -- Low, Medium, High
  impact text not null, -- Low, Medium, High
  score numeric not null default 0,
  mitigation text,
  created_at timestamptz default now()
);

-- Artifacts (e.g., PDFs)
create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  type text not null,
  url text not null,
  sha256 text,
  created_at timestamptz default now()
);

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  entity text not null,
  entity_id uuid not null,
  payload_json jsonb,
  at timestamptz default now()
);

-- RLS
alter table projects enable row level security;
alter table ideas enable row level security;
alter table runs enable row level security;
alter table tasks enable row level security;
alter table proposals enable row level security;
alter table proposal_items enable row level security;
alter table estimates enable row level security;
alter table security_findings enable row level security;
alter table risks enable row level security;
alter table artifacts enable row level security;
alter table audit_log enable row level security;

-- Policies: owner can CRUD within their tenant
create policy if not exists project_owner_rw on projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy if not exists ideas_owner_rw on ideas
  for all using (
    exists (select 1 from projects p where p.id = ideas.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = ideas.project_id and p.owner_id = auth.uid())
  );

-- Runs policy (via ideas -> projects)
create policy if not exists runs_owner_rw on runs
  for all using (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = runs.idea_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = runs.idea_id and p.owner_id = auth.uid()
    )
  );

-- Tasks policy (via runs -> ideas -> projects)
create policy if not exists tasks_owner_rw on tasks
  for all using (
    exists (
      select 1 from runs r
      join ideas i on i.id = r.idea_id
      join projects p on p.id = i.project_id 
      where r.id = tasks.run_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from runs r
      join ideas i on i.id = r.idea_id
      join projects p on p.id = i.project_id 
      where r.id = tasks.run_id and p.owner_id = auth.uid()
    )
  );

-- Proposals policy (via runs -> ideas -> projects)
create policy if not exists proposals_owner_rw on proposals
  for all using (
    exists (
      select 1 from runs r
      join ideas i on i.id = r.idea_id
      join projects p on p.id = i.project_id 
      where r.id = proposals.run_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from runs r
      join ideas i on i.id = r.idea_id
      join projects p on p.id = i.project_id 
      where r.id = proposals.run_id and p.owner_id = auth.uid()
    )
  );

-- Proposal items policy (via proposals -> runs -> ideas -> projects)
create policy if not exists proposal_items_owner_rw on proposal_items
  for all using (
    exists (
      select 1 from proposals pr
      join runs r on r.id = pr.run_id
      join ideas i on i.id = r.idea_id
      join projects p on p.id = i.project_id 
      where pr.id = proposal_items.proposal_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from proposals pr
      join runs r on r.id = pr.run_id
      join ideas i on i.id = r.idea_id
      join projects p on p.id = i.project_id 
      where pr.id = proposal_items.proposal_id and p.owner_id = auth.uid()
    )
  );

-- Estimates policy (via ideas -> projects)
create policy if not exists estimates_owner_rw on estimates
  for all using (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = estimates.idea_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = estimates.idea_id and p.owner_id = auth.uid()
    )
  );

-- Security findings policy (via ideas -> projects)
create policy if not exists security_findings_owner_rw on security_findings
  for all using (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = security_findings.idea_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = security_findings.idea_id and p.owner_id = auth.uid()
    )
  );

-- Risks policy (via ideas -> projects)
create policy if not exists risks_owner_rw on risks
  for all using (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = risks.idea_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = risks.idea_id and p.owner_id = auth.uid()
    )
  );

-- Artifacts policy (via ideas -> projects)
create policy if not exists artifacts_owner_rw on artifacts
  for all using (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = artifacts.idea_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from ideas i 
      join projects p on p.id = i.project_id 
      where i.id = artifacts.idea_id and p.owner_id = auth.uid()
    )
  );

-- Audit log policy (actor-based access)
create policy if not exists audit_log_owner_rw on audit_log
  for all using (actor_id = auth.uid()) with check (actor_id = auth.uid());
