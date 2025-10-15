-- ============================================
-- FIX user_subscriptions TABLE
-- ============================================
-- Add missing subscription_id column and indexes
-- Run this in Supabase SQL Editor

-- Step 1: Add the missing subscription_id column
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_id TEXT UNIQUE;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN user_subscriptions.subscription_id IS 'DODO Payments subscription ID (recurring subscription identifier)';

-- Step 3: Create index on subscription_id for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_id 
ON user_subscriptions(subscription_id);

-- Step 4: Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name = 'subscription_id';

-- Step 5: Check all columns are present
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

