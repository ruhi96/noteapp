-- Add subscription_id column to existing user_subscriptions table
-- Run this in Supabase SQL Editor if the column doesn't exist

-- Check if subscription_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name = 'subscription_id';

-- Add subscription_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD COLUMN subscription_id TEXT;
        
        -- Add unique constraint
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT user_subscriptions_subscription_id_key UNIQUE (subscription_id);
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_id 
        ON user_subscriptions(subscription_id);
        
        RAISE NOTICE 'subscription_id column added successfully';
    ELSE
        RAISE NOTICE 'subscription_id column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
ORDER BY ordinal_position;
