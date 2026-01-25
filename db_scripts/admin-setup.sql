-- =====================================================
-- ADMIN ACCOUNT SETUP
-- Run this AFTER you sign up with your Google account
-- Replace 'your-email@gmail.com' with your actual email
-- =====================================================

-- Step 1: Find your user ID
-- SELECT id, email FROM auth.users WHERE email = 'your-email@gmail.com';

-- Step 2: Set your account as admin (replace the UUID with your actual user ID from Step 1)
UPDATE public.profiles
SET
  is_admin = TRUE,
  account_status = 'approved'
WHERE email = 'your-email@gmail.com';

-- Step 3: Verify the subscription was created (should show unlimited tier)
SELECT
  p.email,
  p.is_admin,
  p.account_status,
  st.display_name as tier_name,
  s.status as subscription_status
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
LEFT JOIN public.subscription_tiers st ON st.id = s.tier_id
WHERE p.email = 'your-email@gmail.com';

-- Expected result: is_admin = true, account_status = 'approved', tier_name = 'Unlimited'
