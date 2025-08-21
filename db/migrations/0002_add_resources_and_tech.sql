-- Migration 0002: Add Resources and Technical Requirements Tables
-- This migration adds tables for managing resources and technical requirements

-- Resources table (internal/external resources)
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  type text not null check (type in ('internal', 'external')),
  title text not null,
  duration integer not null default 0, -- in days
  cost numeric, -- per day cost for external resources
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Technical requirements table
create table if not exists technical_requirements (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  title text not null,
  type text not null check (type in ('hardware', 'software', 'security', 'infrastructure')),
  description text,
  quantity integer default 1,
  status text not null default 'required' check (status in ('required', 'recommended', 'optional')),
  fulfilled boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for new tables
alter table resources enable row level security;
alter table technical_requirements enable row level security;

-- RLS policies for resources (via ideas -> projects)
create policy if not exists resources_owner_rw on resources
  for all using (
    exists (
      select 1 from ideas i
      join projects p on p.id = i.project_id
      where i.id = resources.idea_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from ideas i
      join projects p on p.id = i.project_id
      where i.id = resources.idea_id and p.owner_id = auth.uid()
    )
  );

-- RLS policies for technical requirements (via ideas -> projects)
create policy if not exists technical_requirements_owner_rw on technical_requirements
  for all using (
    exists (
      select 1 from ideas i
      join projects p on p.id = i.project_id
      where i.id = technical_requirements.idea_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from ideas i
      join projects p on p.id = i.project_id
      where i.id = technical_requirements.idea_id and p.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
create index if not exists idx_resources_idea_id on resources(idea_id);
create index if not exists idx_resources_status on resources(status);
create index if not exists idx_technical_requirements_idea_id on technical_requirements(idea_id);
create index if not exists idx_technical_requirements_type on technical_requirements(type);

-- Create updated_at trigger function if it doesn't exist
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

-- Add updated_at triggers
create trigger update_resources_updated_at
  before update on resources
  for each row execute function update_updated_at_column();

create trigger update_technical_requirements_updated_at
  before update on technical_requirements
  for each row execute function update_updated_at_column();
