# Database Setup

This directory contains the database schema and migration files for the Finance Planner application.

## Database Schema

The application uses PostgreSQL via Supabase with the following main tables:
- **Projects** - Main project containers
- **Ideas** - Project ideas and concepts  
- **Runs** - Execution runs of projects
- **Tasks** - Individual tasks within projects
- **Proposals** - Project proposals
- **Proposal_Items** - Items within proposals
- **Estimates** - Cost and time estimates
- **Security_Findings** - Security audit results
- **Artifacts** - File attachments and documents
- **Audit_Log** - System audit trail

## Migration Instructions

### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `migrations/0001_initial.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration
7. Verify tables were created in the **Table Editor**

### Option B: Supabase CLI (Advanced)

If you have the Supabase CLI configured:

```bash
# Initialize Supabase in your project (one time)
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_ID

# Apply migrations
supabase db push

# Or apply specific migration
supabase db reset --linked
```

**Note**: CLI setup is optional. The dashboard method works for most use cases.

## Row Level Security (RLS)

All tables have Row Level Security enabled with policies that:
- Allow users to access only their own data (`owner = auth.uid()`)
- Require authentication for all operations
- Provide secure multi-tenant data isolation

## Storage Setup

The application uses Supabase Storage for file management.

### Required Storage Buckets

#### `exports` Bucket (Private)

**Manual Setup Instructions:**

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name**: `exports`
   - **Public**: `false` (private bucket)
   - **File size limit**: `50MB` (recommended)
   - **Allowed MIME types**: Leave empty for all types
5. Click **Create Bucket**

**Bucket Policies:**

The `exports` bucket should have RLS policies that allow:
- Users to upload files they own
- Users to download their own files
- Users to delete their own files

**Policy Examples:**
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'exports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'exports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'exports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**File Organization:**
Files will be organized by user ID:
```
exports/
├── {user-id-1}/
│   ├── project-export-2024-01.pdf
│   └── financial-report-q4.xlsx
├── {user-id-2}/
│   └── budget-analysis.csv
```

### Future Storage Buckets

Additional buckets may be added for:
- `attachments` - Document attachments (private)
- `templates` - Report templates (public)
- `avatars` - User profile pictures (public)
