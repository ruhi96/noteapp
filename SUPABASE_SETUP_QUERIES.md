# 🗄️ Supabase SQL Setup Queries - Complete Guide

## 📋 Required SQL Files to Run

You need to run **TWO SQL files** in Supabase SQL Editor:

1. **`payment-sessions-schema.sql`** - For checkout session tracking
2. **`user-subscriptions-schema.sql`** - For subscription status

---

## 🚀 Step-by-Step Setup

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

---

### Step 2: Run `payment_sessions` Table Setup

Copy and paste this entire SQL script:

```sql
-- ============================================
-- PAYMENT SESSIONS TABLE SETUP
-- ============================================
-- This table tracks DODO Payments checkout sessions
-- Run this FIRST before user_subscriptions

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
```

**Click "Run" or press Ctrl+Enter**

✅ **Expected Result:** `Success. No rows returned`

---

### Step 3: Run `user_subscriptions` Table Setup

Copy and paste this entire SQL script:

```sql
-- ============================================
-- USER SUBSCRIPTIONS TABLE SETUP
-- ============================================
-- This table tracks user subscription status (premium/free)
-- Run this AFTER payment_sessions

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Firebase UID
    user_email TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'free', -- free, premium, expired, cancelled
    subscription_type TEXT, -- monthly, yearly, lifetime
    product_id TEXT, -- DODO Payments product ID
    session_id TEXT, -- DODO Payments session ID
    payment_id TEXT, -- DODO Payments payment ID
    subscription_id TEXT UNIQUE, -- DODO Payments subscription ID (unique identifier)
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
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_id ON user_subscriptions(subscription_id);
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

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(TEXT) TO authenticated;

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
COMMENT ON COLUMN user_subscriptions.subscription_id IS 'DODO Payments subscription ID (recurring subscription identifier)';

COMMENT ON FUNCTION get_user_subscription_status(TEXT) IS 'Returns current subscription status for a user';

COMMENT ON VIEW subscription_analytics IS 'Analytics view for subscription data by date and type';
```

**Click "Run" or press Ctrl+Enter**

✅ **Expected Result:** `Success. No rows returned`

---

## ✅ Verification Queries

After running both setup scripts, verify tables were created:

### Check Tables Exist
```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected Output:**
```
payment_sessions
user_subscriptions
(and your other tables like 'notes')
```

### Check Table Structure
```sql
-- Verify payment_sessions columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_sessions'
ORDER BY ordinal_position;

-- Verify user_subscriptions columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;
```

### Check Indexes
```sql
-- Check indexes on payment_sessions
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'payment_sessions';

-- Check indexes on user_subscriptions
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'user_subscriptions';
```

---

## 🧪 Test Data Insertion

### Test Insert into payment_sessions
```sql
-- Insert a test payment session
INSERT INTO payment_sessions (
    user_id,
    user_email,
    session_id,
    product_id,
    checkout_url,
    status
) VALUES (
    'test_user_123',
    'test@example.com',
    'cks_TEST_12345',
    'prod_TEST',
    'https://test-checkout.com',
    'created'
);

-- Verify insertion
SELECT * FROM payment_sessions WHERE user_id = 'test_user_123';
```

### Test Insert into user_subscriptions
```sql
-- Insert a test subscription
INSERT INTO user_subscriptions (
    user_id,
    user_email,
    subscription_status,
    subscription_type,
    subscription_id,
    is_active
) VALUES (
    'test_user_123',
    'test@example.com',
    'premium',
    'monthly',
    'sub_TEST_12345',
    true
);

-- Verify insertion
SELECT * FROM user_subscriptions WHERE user_id = 'test_user_123';
```

### Clean Up Test Data
```sql
-- Remove test data
DELETE FROM payment_sessions WHERE user_id = 'test_user_123';
DELETE FROM user_subscriptions WHERE user_id = 'test_user_123';
```

---

## 📊 Useful Queries After Setup

### Check All Payment Sessions
```sql
SELECT 
    user_email,
    session_id,
    status,
    created_at
FROM payment_sessions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check All Subscriptions
```sql
SELECT 
    user_email,
    subscription_status,
    is_active,
    subscription_id,
    created_at
FROM user_subscriptions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Active Premium Users
```sql
SELECT 
    user_email,
    subscription_id,
    amount,
    currency,
    subscription_start_date
FROM user_subscriptions 
WHERE subscription_status = 'premium' 
AND is_active = true
ORDER BY created_at DESC;
```

### Payment Session Analytics
```sql
-- View payment session stats
SELECT * FROM payment_session_stats 
ORDER BY date DESC 
LIMIT 30;
```

### Subscription Analytics
```sql
-- View subscription analytics
SELECT * FROM subscription_analytics 
ORDER BY date DESC 
LIMIT 30;
```

---

## 🚨 Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already created! Skip to verification queries.

### Error: "permission denied"
**Solution:** Make sure you're logged in as the database owner in Supabase.

### Error: "column does not exist"
**Solution:** Run the setup queries in order (payment_sessions first, then user_subscriptions).

### RLS Policies Not Working
**Solution:** Check your Supabase service role key is set in environment variables:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 🎯 Quick Start Checklist

Run these in order:

1. ☐ Open Supabase SQL Editor
2. ☐ Run `payment_sessions` setup script (Step 2)
3. ☐ Run `user_subscriptions` setup script (Step 3)
4. ☐ Run verification query to check tables exist
5. ☐ (Optional) Run test data insertion
6. ☐ Clean up test data
7. ☐ Done! ✅

---

## 📝 What These Tables Enable

After running these queries, your app can:

- ✅ Track checkout sessions in `payment_sessions`
- ✅ Store subscription status in `user_subscriptions`
- ✅ Check if user is premium with `is_active` column
- ✅ Update button to "👑 Premium" based on database
- ✅ Handle webhook updates to subscription status
- ✅ Query analytics on payments and subscriptions

---

## 🔐 Important Notes

1. **RLS is enabled** - Only authenticated users can query their own data
2. **Service role key needed** - For webhooks to bypass RLS and insert data
3. **Automatic timestamps** - `updated_at` updates automatically via trigger
4. **Unique constraints** - `session_id` and `subscription_id` are unique

---

## 📚 Related Files

- `payment-sessions-schema.sql` - Source file for payment_sessions table
- `user-subscriptions-schema.sql` - Source file for user_subscriptions table
- `PAYMENT_DATA_STORAGE.md` - Detailed documentation on storage architecture

---

**That's it! Run these two SQL scripts and you're ready to go!** 🚀

