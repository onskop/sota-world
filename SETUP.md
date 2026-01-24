# Smart Notepad - Setup Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- Google Cloud Console access (for OAuth)

---

## 1. Supabase Project Setup

### Create Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details
4. Wait for project to provision (~2 minutes)

### Get API Credentials
1. Go to **Settings > API**
2. Copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` `public` key (starts with `eyJ...`)
   - `service_role` `secret` key (starts with `eyJ...`)

### Configure Google OAuth
1. In Supabase dashboard, go to **Authentication > Providers**
2. Find "Google" and toggle it on
3. Keep this tab open (you'll paste Client ID/Secret here later)

---

## 2. Google Cloud Console Setup

### Create OAuth Credentials
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Configure OAuth consent screen if prompted (External, add your email)
6. Application type: **Web application**
7. Name: "Smart Notepad"
8. **Authorized JavaScript origins**: `http://localhost:3000` (add production URL later)
9. **Authorized redirect URIs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-project-ref.supabase.co/auth/v1/callback` (replace with your Supabase project URL)
10. Click **Create**
11. Copy Client ID and Client Secret

### Link to Supabase
1. Back in Supabase **Authentication > Providers > Google**
2. Paste Client ID and Client Secret
3. Click **Save**

---

## 3. Local Environment Setup

### Install Dependencies
```bash
cd c:\Projects\dev\sota-world
npm install
```

### Configure Environment Variables
Create `.env.local` (or update `.env`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-service-role-key

# Keep your existing AI Gateway keys
VERCEL_AI_GATEWAY_API_KEY=vck_...
VERCEL_AI_GATEWAY_URL=https://ai-gateway.vercel.sh/v1/chat/completions
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 4. Database Schema Setup

### Run Main Schema
1. Go to Supabase dashboard > **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Click **Run** (or press F5)
5. Verify no errors in output

### Configure Authentication URLs
1. Go to **Authentication > URL Configuration**
2. Set **Site URL**: `http://localhost:3000`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/*` (wildcard for all routes)
4. Click **Save**

---

## 5. Set Up Your Admin Account

### Step 1: Sign Up
1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Click "Get Started"
4. Sign in with YOUR Google account
5. You'll see "Waiting for Approval" page - **this is expected**

### Step 2: Promote to Admin
1. Go to Supabase dashboard > **SQL Editor**
2. Create a new query
3. Copy contents of `supabase/admin-setup.sql`
4. Replace `'your-email@gmail.com'` with YOUR actual email
5. Run the query (Steps 2 only)
6. Verify in Step 3 that you see:
   - `is_admin` = `true`
   - `account_status` = `'approved'`
   - `tier_name` = `'Unlimited'`
   - `subscription_status` = `'active'`

### Step 3: Verify Access
1. Refresh the "Waiting for Approval" page
2. You should be redirected to `/dashboard`
3. You now have unlimited access with no restrictions

---

## 6. Verify Everything Works

### Test Authentication Flow
- ✅ Landing page loads at `http://localhost:3000`
- ✅ Login redirects to Google OAuth
- ✅ After auth, redirects to `/dashboard`
- ✅ Dashboard shows your name and email
- ✅ Sign out button works

### Test Database
Open Supabase dashboard > **Table Editor**:
- ✅ `profiles` table has your row
- ✅ `subscriptions` table has your subscription
- ✅ `subscription_tiers` has 3 tiers (free, pro, unlimited)

### Test Pending Users
1. Sign out
2. Sign in with a DIFFERENT Google account
3. Should see "Waiting for Approval" page
4. In Supabase, run:
   ```sql
   UPDATE public.profiles
   SET account_status = 'approved'
   WHERE email = 'other-user@gmail.com';
   ```
5. Refresh - should now access dashboard with free tier

---

## 7. Future: Production Deployment

When deploying to Vercel/production:

1. **Update Google Cloud Console**:
   - Add production URL to Authorized JavaScript origins
   - Add `https://your-app.vercel.app/auth/callback` to redirect URIs

2. **Update Supabase**:
   - Go to Authentication > URL Configuration
   - Update Site URL to production URL
   - Add production redirect URLs

3. **Set Environment Variables in Vercel**:
   - Add all `NEXT_PUBLIC_*` variables
   - Add `SUPABASE_SERVICE_ROLE_KEY`
   - Keep AI Gateway keys

---

## Troubleshooting

### "Invalid login credentials"
- Check that Google OAuth is enabled in Supabase
- Verify redirect URLs match exactly (no trailing slashes)

### "Database error: relation does not exist"
- Run `supabase/schema.sql` in SQL Editor
- Check for errors in query output

### "Not authorized to access dashboard"
- Run `supabase/admin-setup.sql` with your email
- Verify `is_admin = true` in profiles table

### Environment variables not loading
- Restart dev server after changing `.env` files
- Check variable names have `NEXT_PUBLIC_` prefix for client-side access

---

## Next Steps

Phase 1 is complete! Ready to build:
- **Phase 2**: Notes CRUD (create, edit, delete, list)
- **Phase 3**: Voice recording & transcription
- **Phase 4**: AI tools and actions
- **Phase 5**: Automation rules

See [PROJECT_VISION.md](PROJECT_VISION.md) for full roadmap.
