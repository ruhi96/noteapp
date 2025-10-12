-- User Subscriptions Table for Premium Status Tracking
-- Run this SQL in Supabase SQL Editor

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Firebase UID
    user_email TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'free', -- free, premium, expired, cancelled
    subscription_type TEXT, -- monthly, yearly, lifetime
    product_id TEXT, -- DODO Payments product ID
    session_id TEXT UNIQUE, -- DODO Payments session ID
    payment_id TEXT, -- DODO Payments payment ID
    amount DECIMAL(10,2), -- Payment amount
    currency TEXT DEFAULT 'USD',
    subscription_start_date TIMESTAMPTZ, -- When subscription became active
    subscription_end_date TIMESTAMPTZ, -- When subscription expires (for recurring)
    is_active BOOLEAN DEFAULT true, -- Whether subscription is currently active
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_session_id ON user_subscriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payment_id ON user_subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active ON user_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_created_at ON user_subscriptions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_subscriptions
-- Policy: Users can view their own subscription status
CREATE POLICY "Users can view their own subscription status"
ON user_subscriptions FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- Policy: System can insert subscription records (for webhooks)
CREATE POLICY "System can insert subscription records"
ON user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Policy: System can update subscription records (for webhooks)
CREATE POLICY "System can update subscription records"
ON user_subscriptions FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Create function to get user's current subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uid TEXT)
RETURNS TABLE (
    subscription_status TEXT,
    subscription_type TEXT,
    is_active BOOLEAN,
    subscription_end_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.subscription_status,
        us.subscription_type,
        us.is_active,
        us.subscription_end_date
    FROM user_subscriptions us
    WHERE us.user_id = user_uid
    AND us.is_active = true
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update subscription status
CREATE OR REPLACE FUNCTION update_subscription_status(
    user_uid TEXT,
    new_status TEXT,
    payment_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    -- First, deactivate any existing active subscriptions
    UPDATE user_subscriptions 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = user_uid AND is_active = true;
    
    -- If this is a new premium subscription, create a new record
    IF new_status = 'premium' AND payment_data IS NOT NULL THEN
        INSERT INTO user_subscriptions (
            user_id,
            user_email,
            subscription_status,
            subscription_type,
            product_id,
            session_id,
            payment_id,
            amount,
            currency,
            subscription_start_date,
            is_active
        ) VALUES (
            user_uid,
            payment_data->>'user_email',
            'premium',
            payment_data->>'subscription_type',
            payment_data->>'product_id',
            payment_data->>'session_id',
            payment_data->>'payment_id',
            (payment_data->>'amount')::DECIMAL,
            COALESCE(payment_data->>'currency', 'USD'),
            NOW(),
            true
        );
        GET DIAGNOSTICS updated_rows = ROW_COUNT;
    ELSE
        -- For other status updates, just update the latest record
        UPDATE user_subscriptions 
        SET 
            subscription_status = new_status,
            is_active = (new_status = 'premium'),
            updated_at = NOW()
        WHERE id = (
            SELECT id 
            FROM user_subscriptions 
            WHERE user_id = user_uid
            ORDER BY created_at DESC
            LIMIT 1
        );
        GET DIAGNOSTICS updated_rows = ROW_COUNT;
    END IF;
    
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_status(TEXT, TEXT, JSONB) TO authenticated;

-- Create view for subscription analytics
CREATE OR REPLACE VIEW subscription_analytics AS
SELECT 
    DATE(created_at) as date,
    subscription_status,
    subscription_type,
    COUNT(*) as subscription_count,
    SUM(CASE WHEN subscription_status = 'premium' THEN amount ELSE 0 END) as revenue
FROM user_subscriptions
GROUP BY DATE(created_at), subscription_status, subscription_type
ORDER BY date DESC;

-- Grant permissions on the view
GRANT SELECT ON subscription_analytics TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription status and payment history';
COMMENT ON COLUMN user_subscriptions.subscription_status IS 'Current subscription status: free, premium, expired, cancelled';
COMMENT ON COLUMN user_subscriptions.is_active IS 'Whether the subscription is currently active';
COMMENT ON COLUMN user_subscriptions.session_id IS 'DODO Payments session ID';
COMMENT ON COLUMN user_subscriptions.payment_id IS 'DODO Payments payment ID';

COMMENT ON FUNCTION get_user_subscription_status(TEXT) IS 'Returns current subscription status for a user';
COMMENT ON FUNCTION update_subscription_status(TEXT, TEXT, JSONB) IS 'Updates user subscription status and handles premium activations';

COMMENT ON VIEW subscription_analytics IS 'Analytics view for subscription data by date and type';
