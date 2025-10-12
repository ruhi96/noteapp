-- Query to verify subscription was saved from webhook
-- Run this in Supabase SQL Editor after webhook is received

-- Check if subscription exists for the test user
SELECT 
    id,
    user_id,
    user_email,
    subscription_id,
    payment_id,
    subscription_status,
    is_active,
    amount,
    currency,
    created_at,
    updated_at
FROM user_subscriptions
WHERE subscription_id = 'sub_65BdAyLSsVOQL0xXXrUdF'
ORDER BY created_at DESC;

-- Check all subscriptions for user: ksNz0ZmkelTiqHar66BsOcmMTGI2
SELECT 
    id,
    user_email,
    subscription_id,
    payment_id,
    subscription_status,
    is_active,
    amount,
    currency,
    created_at,
    updated_at
FROM user_subscriptions
WHERE user_id = 'ksNz0ZmkelTiqHar66BsOcmMTGI2'
ORDER BY created_at DESC;

-- Check all active premium subscriptions
SELECT 
    user_id,
    user_email,
    subscription_id,
    subscription_status,
    is_active,
    amount,
    currency,
    created_at
FROM user_subscriptions
WHERE subscription_status = 'premium' 
AND is_active = true
ORDER BY created_at DESC;
