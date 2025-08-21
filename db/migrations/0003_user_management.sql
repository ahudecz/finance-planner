-- Migration 0003: User Management and Permissions
-- This migration adds comprehensive user management, roles, and permissions

-- Organizations table
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  owner_id uuid references auth.users(id) on delete cascade,
  settings jsonb not null default '{
    "allowSelfRegistration": false,
    "requireEmailVerification": true,
    "defaultRole": "viewer"
  }'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User profiles table (extends auth.users)
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'viewer' check (role in ('admin', 'manager', 'analyst', 'viewer')),
  permissions text[] not null default '{}',
  organization_id uuid references organizations(id) on delete set null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User invitations table
create table if not exists user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('admin', 'manager', 'analyst', 'viewer')),
  organization_id uuid not null references organizations(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Project collaborators table (for project-specific permissions)
create table if not exists project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  permissions text[] not null default '{}',
  added_by uuid references auth.users(id),
  added_at timestamptz default now(),
  unique(project_id, user_id)
);

-- Enable RLS for all new tables
alter table organizations enable row level security;
alter table user_profiles enable row level security;
alter table user_invitations enable row level security;
alter table project_collaborators enable row level security;

-- RLS policies for organizations
create policy if not exists organizations_owner_full_access on organizations
  for all using (owner_id = auth.uid());

create policy if not exists organizations_members_read on organizations
  for select using (
    exists (
      select 1 from user_profiles up 
      where up.id = auth.uid() 
      and up.organization_id = organizations.id
      and up.is_active = true
    )
  );

-- RLS policies for user_profiles
create policy if not exists user_profiles_own_profile on user_profiles
  for all using (id = auth.uid());

create policy if not exists user_profiles_org_members_read on user_profiles
  for select using (
    exists (
      select 1 from user_profiles up 
      where up.id = auth.uid() 
      and up.organization_id = user_profiles.organization_id
      and up.is_active = true
    )
  );

create policy if not exists user_profiles_org_admins_manage on user_profiles
  for all using (
    exists (
      select 1 from user_profiles up 
      where up.id = auth.uid() 
      and up.organization_id = user_profiles.organization_id
      and up.role in ('admin', 'manager')
      and up.is_active = true
    )
  );

-- RLS policies for user_invitations
create policy if not exists user_invitations_org_access on user_invitations
  for all using (
    exists (
      select 1 from user_profiles up 
      where up.id = auth.uid() 
      and up.organization_id = user_invitations.organization_id
      and up.role in ('admin', 'manager')
      and up.is_active = true
    )
  );

-- RLS policies for project_collaborators
create policy if not exists project_collaborators_project_access on project_collaborators
  for all using (
    exists (
      select 1 from projects p
      where p.id = project_collaborators.project_id 
      and p.owner_id = auth.uid()
    )
    or 
    user_id = auth.uid()
    or
    exists (
      select 1 from project_collaborators pc
      where pc.project_id = project_collaborators.project_id
      and pc.user_id = auth.uid()
      and pc.role in ('owner', 'editor')
    )
  );

-- Create indexes for better performance
create index if not exists idx_organizations_owner_id on organizations(owner_id);
create index if not exists idx_organizations_slug on organizations(slug);
create index if not exists idx_user_profiles_organization_id on user_profiles(organization_id);
create index if not exists idx_user_profiles_email on user_profiles(email);
create index if not exists idx_user_profiles_role on user_profiles(role);
create index if not exists idx_user_invitations_email on user_invitations(email);
create index if not exists idx_user_invitations_organization_id on user_invitations(organization_id);
create index if not exists idx_project_collaborators_project_id on project_collaborators(project_id);
create index if not exists idx_project_collaborators_user_id on project_collaborators(user_id);

-- Add updated_at triggers
create trigger update_organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at_column();

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();

-- Function to automatically create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to set default permissions based on role
create or replace function public.set_role_permissions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Set permissions based on role
  case new.role
    when 'admin' then
      new.permissions := ARRAY[
        'create_projects', 'edit_projects', 'delete_projects',
        'create_ideas', 'edit_ideas', 'delete_ideas',
        'manage_risks', 'view_budget', 'edit_budget',
        'export_data', 'manage_users', 'view_analytics'
      ];
    when 'manager' then
      new.permissions := ARRAY[
        'create_projects', 'edit_projects',
        'create_ideas', 'edit_ideas',
        'manage_risks', 'view_budget', 'edit_budget',
        'export_data', 'view_analytics'
      ];
    when 'analyst' then
      new.permissions := ARRAY[
        'create_ideas', 'edit_ideas',
        'manage_risks', 'view_budget',
        'export_data'
      ];
    when 'viewer' then
      new.permissions := ARRAY['view_budget', 'export_data'];
    else
      new.permissions := ARRAY['view_budget'];
  end case;
  
  return new;
end;
$$;

-- Trigger to set permissions when role is created or updated
create trigger set_user_permissions
  before insert or update of role on user_profiles
  for each row execute procedure public.set_role_permissions();

-- Update existing projects table to include better ownership tracking
alter table projects add column if not exists visibility text default 'private' check (visibility in ('private', 'organization', 'public'));
alter table projects add column if not exists collaborator_count integer default 0;

-- Function to update project collaborator count
create or replace function update_project_collaborator_count()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update projects set collaborator_count = collaborator_count + 1 where id = NEW.project_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update projects set collaborator_count = collaborator_count - 1 where id = OLD.project_id;
    return OLD;
  end if;
  return null;
end;
$$;

-- Trigger to maintain collaborator count
create trigger maintain_project_collaborator_count
  after insert or delete on project_collaborators
  for each row execute function update_project_collaborator_count();
