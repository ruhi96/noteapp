-- Payment Sessions Table for DODO Payments Integration
-- Run this SQL in Supabase SQL Editor

-- Create payment_sessions table for tracking checkout sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Firebase UID
    user_email TEXT NOT NULL,
    session_id TEXT UNIQUE NOT NULL, -- DODO Payments session ID
    product_id TEXT NOT NULL, -- DODO Payments product ID
    checkout_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created', -- created, completed, cancelled, failed
    payment_status TEXT, -- Payment status from DODO Payments
    amount DECIMAL(10,2), -- Payment amount (if available)
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_created_at ON payment_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_sessions
-- Policy: Users can view their own payment sessions
CREATE POLICY "Users can view their own payment sessions"
ON payment_sessions FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- Policy: System can insert payment sessions (for backend)
CREATE POLICY "System can insert payment sessions"
ON payment_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Policy: System can update payment sessions (for status updates)
CREATE POLICY "System can update payment sessions"
ON payment_sessions FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payment_sessions_updated_at 
    BEFORE UPDATE ON payment_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_payment_sessions_updated_at();

-- Create view for payment session analytics
CREATE OR REPLACE VIEW payment_session_stats AS
SELECT 
    DATE(created_at) as date,
    status,
    COUNT(*) as session_count,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue
FROM payment_sessions
GROUP BY DATE(created_at), status
ORDER BY date DESC;

-- Grant permissions on the view
GRANT SELECT ON payment_session_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE payment_sessions IS 'Tracks DODO Payments checkout sessions and their status';
COMMENT ON COLUMN payment_sessions.session_id IS 'DODO Payments session ID';
COMMENT ON COLUMN payment_sessions.product_id IS 'DODO Payments product ID';
COMMENT ON COLUMN payment_sessions.checkout_url IS 'DODO Payments checkout URL';
COMMENT ON COLUMN payment_sessions.status IS 'Session status: created, completed, cancelled, failed';

COMMENT ON VIEW payment_session_stats IS 'Analytics view for payment sessions by date and status';
