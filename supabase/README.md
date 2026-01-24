# Supabase Setup Instructions

## Initial Setup (New Database)

Execute these SQL scripts in order in your Supabase SQL Editor:

1. **schema.sql** - Main database schema (profiles, subscriptions, voice_recordings, notes)
   - Navigate to Supabase Dashboard → SQL Editor
   - Create a new query
   - Copy contents of `schema.sql`
   - Run the query

2. **storage-setup.sql** - Storage bucket and RLS policies for voice recordings
   - Create another new query
   - Copy contents of `storage-setup.sql`
   - Run the query

3. **admin-setup.sql** - Admin user setup (if needed)

## Migrations (Existing Database)

If you're upgrading from the original schema, run migrations in the `migrations/` folder:

### Migration 001: Lists & Router System
**File**: `migrations/001_lists_and_router.sql`

**What it does**:
- Renames `subscriptions` → `billing_subscriptions`
- Creates new tables: `lists`, `list_items`, `tasks`
- Migrates existing notes to lists
- Drops the `notes` table

**To run**:
1. Navigate to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy contents of `migrations/001_lists_and_router.sql`
4. Run the query

**Verify migration**:
```sql
-- Check renamed table
SELECT COUNT(*) FROM billing_subscriptions;

-- Check new tables
SELECT COUNT(*) FROM lists;
SELECT COUNT(*) FROM list_items;
SELECT COUNT(*) FROM tasks;

-- Verify notes table is gone (should return 0 rows)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notes';
```

## Verification

After running the scripts, verify with these queries:

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'subscriptions', 'voice_recordings', 'notes');

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'voice-recordings';

-- Check your user profile
SELECT * FROM profiles WHERE id = auth.uid();
```

## Next Steps

After database setup is complete:
1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`
3. Navigate to `/dashboard/voice-command` to test voice recording
