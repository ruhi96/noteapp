# 💾 Payment Data Storage - Where DODO Payments Responses Are Stored

## Overview

DODO Payments response data is stored in **TWO tables** in Supabase:

1. **`payment_sessions`** - Temporary storage for checkout sessions
2. **`user_subscriptions`** - Permanent storage for subscription status

---

## 📊 Table 1: `payment_sessions` (Temporary Storage)

### Purpose
Tracks the **initial checkout session** created when user clicks "Upgrade to Premium"

### When Data is Stored
**BEFORE** user completes payment (when checkout session is created)

### Schema
```sql
CREATE TABLE payment_sessions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,           -- Firebase UID
    user_email TEXT NOT NULL,        -- User's email
    session_id TEXT UNIQUE NOT NULL, -- DODO checkout session ID
    product_id TEXT NOT NULL,        -- DODO product ID
    checkout_url TEXT NOT NULL,      -- URL user is redirected to
    status TEXT DEFAULT 'created',   -- created, completed, cancelled, failed
    payment_status TEXT,             -- Payment status from DODO
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Data Flow

**Step 1: User Clicks "Upgrade to Premium"**

```javascript
// server.js - /api/payments/create-checkout
const session = await createDodoCheckoutSession();

// Store in payment_sessions table
await supabase
    .from('payment_sessions')
    .insert([{
        user_id: 'QLbUfs9JCXRboUoqXKYGT3omFlO2',
        user_email: 'user@example.com',
        session_id: 'cks_URuC2d4xNonSIKk3n8k6m',  // From DODO response
        product_id: 'prod_ABC123',
        checkout_url: 'https://checkout.dodopayments.com/...',
        status: 'created'  // ← Initially 'created'
    }]);
```

**Step 2: Payment Completes**

```javascript
// server.js - /payment/success callback
await supabase
    .from('payment_sessions')
    .update({ 
        status: 'completed',  // ← Updated to 'completed'
        payment_status: 'succeeded'
    })
    .eq('session_id', session_id);
```

**Step 3: Payment Cancelled**

```javascript
// server.js - /payment/cancel callback
await supabase
    .from('payment_sessions')
    .update({ 
        status: 'cancelled'  // ← Updated to 'cancelled'
    })
    .eq('session_id', session_id);
```

### Use Cases for `payment_sessions`

1. **Fallback for user_id lookup** - If webhook doesn't include metadata
2. **Tracking incomplete payments** - Sessions that were created but never completed
3. **Analytics** - How many users start checkout vs complete
4. **Debugging** - Trace payment flow issues

---

## 🗄️ Table 2: `user_subscriptions` (Permanent Storage)

### Purpose
Stores the **final subscription status** after payment succeeds

### When Data is Stored
**AFTER** payment succeeds (when webhook is received)

### Schema
```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,              -- Firebase UID
    user_email TEXT NOT NULL,           -- User's email
    subscription_status TEXT DEFAULT 'free',  -- free, premium, expired, cancelled
    subscription_type TEXT,             -- monthly, yearly, lifetime
    product_id TEXT,                    -- DODO product ID
    session_id TEXT,                    -- Links to payment_sessions
    payment_id TEXT,                    -- DODO payment ID ← From webhook
    subscription_id TEXT UNIQUE,        -- DODO subscription ID ← From webhook
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,     -- Whether subscription is active
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Data Flow

**Step 1: Webhook Receives Payment Success**

**DODO Sends:**
```json
POST /api/payments/webhook
{
  "type": "payment.succeeded",
  "data": {
    "subscription_id": "sub_65BdAyLSsVOQL0xXXrUdF",  ← Subscription ID
    "payment_id": "pay_y8Kv1LHb5If80PkXn7dmH",      ← Payment ID
    "checkout_session_id": "cks_URuC2d4xNonSIKk3n8k6m",
    "total_amount": 10905,
    "currency": "INR",
    "customer": {
      "email": "user@example.com"
    },
    "metadata": {
      "user_id": "QLbUfs9JCXRboUoqXKYGT3omFlO2"
    }
  }
}
```

**Step 2: Server Stores in Database**

```javascript
// server.js - handlePaymentCompleted()
await supabaseService
    .from('user_subscriptions')
    .insert([{
        user_id: 'QLbUfs9JCXRboUoqXKYGT3omFlO2',
        user_email: 'user@example.com',
        subscription_id: 'sub_65BdAyLSsVOQL0xXXrUdF',  // ← From webhook
        payment_id: 'pay_y8Kv1LHb5If80PkXn7dmH',      // ← From webhook
        session_id: 'cks_URuC2d4xNonSIKk3n8k6m',
        subscription_status: 'premium',  // ← Set to premium
        is_active: true,                 // ← Set to active
        amount: 109.05,  // Converted from 10905 cents
        currency: 'INR',
        subscription_start_date: NOW(),
        product_id: 'prod_ABC123'
    }]);
```

### Use Cases for `user_subscriptions`

1. **Check subscription status** - Is user premium or free?
2. **Display premium badge** - Change button to "👑 Premium"
3. **Access control** - Enable/disable premium features
4. **Subscription management** - Track renewals, cancellations
5. **Revenue tracking** - How much each user paid

---

## 🔄 Complete Storage Flow

```
User Clicks "Upgrade to Premium"
         ↓
┌─────────────────────────────────────┐
│ 1. CREATE CHECKOUT SESSION          │
│    - Call DODO Payments API         │
│    - Get session_id: cks_XXX        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 2. STORE IN payment_sessions        │
│    - user_id                        │
│    - session_id: cks_XXX            │
│    - status: 'created'              │
│    - checkout_url                   │
└─────────────────────────────────────┘
         ↓
User Redirected to DODO Payments
         ↓
User Completes Payment
         ↓
┌─────────────────────────────────────┐
│ 3. UPDATE payment_sessions          │
│    - status: 'completed'            │
│    - payment_status: 'succeeded'    │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 4. WEBHOOK RECEIVED                 │
│    - subscription_id: sub_XXX       │
│    - payment_id: pay_XXX            │
│    - customer info                  │
│    - metadata                       │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 5. STORE IN user_subscriptions      │
│    - user_id                        │
│    - subscription_id: sub_XXX       │
│    - payment_id: pay_XXX            │
│    - subscription_status: 'premium' │
│    - is_active: true                │
└─────────────────────────────────────┘
         ↓
Button Changes to "👑 Premium"
```

---

## 🔍 Where is Subscription ID Stored?

### Temporary Storage
**Table:** `payment_sessions`  
**Column:** `session_id` (checkout session ID, NOT subscription ID)  
**Stored:** When checkout is created  
**Example:** `cks_URuC2d4xNonSIKk3n8k6m`

### Permanent Storage
**Table:** `user_subscriptions`  
**Column:** `subscription_id` (actual subscription ID from DODO)  
**Stored:** When webhook receives payment success  
**Example:** `sub_65BdAyLSsVOQL0xXXrUdF`

### Key Difference

- **`session_id`** = Checkout session (temporary, for single checkout)
- **`subscription_id`** = Subscription (permanent, for recurring billing)

---

## 📋 Query Examples

### Check Payment Session Status
```sql
-- See if user started checkout
SELECT 
    user_email,
    session_id,
    status,
    checkout_url,
    created_at
FROM payment_sessions 
WHERE user_id = 'QLbUfs9JCXRboUoqXKYGT3omFlO2'
ORDER BY created_at DESC;
```

### Check Subscription Status
```sql
-- See if user has active subscription
SELECT 
    user_email,
    subscription_id,
    subscription_status,
    is_active,
    payment_id,
    amount,
    created_at
FROM user_subscriptions 
WHERE user_id = 'QLbUfs9JCXRboUoqXKYGT3omFlO2'
AND is_active = true;
```

### Join Both Tables
```sql
-- See complete payment journey
SELECT 
    ps.session_id,
    ps.status as checkout_status,
    ps.created_at as checkout_created,
    us.subscription_id,
    us.subscription_status,
    us.payment_id,
    us.is_active,
    us.created_at as subscription_created
FROM payment_sessions ps
LEFT JOIN user_subscriptions us 
    ON ps.session_id = us.session_id
WHERE ps.user_id = 'QLbUfs9JCXRboUoqXKYGT3omFlO2'
ORDER BY ps.created_at DESC;
```

---

## 🗑️ Data Cleanup

### Incomplete Sessions
Sessions that were created but never completed:

```sql
-- Find abandoned checkouts
SELECT 
    user_email,
    session_id,
    created_at,
    NOW() - created_at as age
FROM payment_sessions 
WHERE status = 'created'
AND created_at < NOW() - INTERVAL '1 day';
```

These can be cleaned up periodically:
```sql
-- Delete old abandoned sessions (>30 days)
DELETE FROM payment_sessions 
WHERE status = 'created'
AND created_at < NOW() - INTERVAL '30 days';
```

### Cancelled Subscriptions
```sql
-- Find cancelled subscriptions
SELECT * FROM user_subscriptions 
WHERE subscription_status = 'cancelled'
AND is_active = false;
```

---

## 🔐 Security Notes

1. **`payment_sessions`** - Uses anon key (RLS applies)
2. **`user_subscriptions`** - Webhooks use service role key (bypasses RLS)
3. Both tables have RLS enabled for user queries
4. Only backend can insert/update subscription data

---

## 📊 Summary Table

| Data | Stored In | When | Persistence |
|------|-----------|------|-------------|
| Checkout Session ID | `payment_sessions.session_id` | Before payment | Temporary |
| Checkout URL | `payment_sessions.checkout_url` | Before payment | Temporary |
| Session Status | `payment_sessions.status` | Before/After payment | Temporary |
| Subscription ID | `user_subscriptions.subscription_id` | After payment success | Permanent |
| Payment ID | `user_subscriptions.payment_id` | After payment success | Permanent |
| Subscription Status | `user_subscriptions.subscription_status` | After payment success | Permanent |
| Is Active | `user_subscriptions.is_active` | After payment success | Permanent |

---

## 🎯 Key Takeaways

1. **Two tables, two purposes:**
   - `payment_sessions` = Tracks checkout process
   - `user_subscriptions` = Tracks subscription state

2. **Subscription ID storage:**
   - NOT in `payment_sessions` (only has session_id)
   - Stored in `user_subscriptions.subscription_id`
   - Comes from DODO webhook after payment

3. **Data flow:**
   - Create checkout → Store session
   - Payment success → Store subscription
   - Webhook delivers subscription_id
   - Button checks subscription table

4. **Why two tables?**
   - Track incomplete payments
   - Fallback for user_id lookup
   - Separate concerns (checkout vs subscription)
   - Analytics and debugging

