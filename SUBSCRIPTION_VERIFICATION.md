# 🔒 Subscription Status Verification Guide

This document explains how the subscription system works and how to verify it's functioning correctly.

## 📋 How It Works

### 1️⃣ Webhook Updates `user_subscriptions` Table

When DODO Payments webhook receives a `payment.succeeded` event:

**Server (`server.js` lines 364-497):**
```javascript
// Updates or creates subscription record
{
    user_id: userId,              // From metadata or payment_sessions
    subscription_id: subscription_id,  // From webhook
    subscription_status: 'premium',   // Set to premium
    is_active: true,                  // Set to true
    payment_id: payment_id,
    amount: total_amount / 100,
    currency: currency,
    // ... other fields
}
```

**Database Table Structure:**
- `user_id` (TEXT) - Firebase UID of the user
- `subscription_id` (TEXT) - DODO Payments subscription ID (UNIQUE)
- `subscription_status` (TEXT) - 'free', 'premium', 'expired', or 'cancelled'
- `is_active` (BOOLEAN) - `true` if subscription is active, `false` otherwise
- Other fields for tracking payment details

### 2️⃣ API Endpoint Checks Subscription Status

**Endpoint:** `GET /api/user/subscription-status`

**Logic (`server.js` lines 630-661):**
```javascript
// Query user_subscriptions table
SELECT * FROM user_subscriptions 
WHERE user_id = '<logged_in_user_id>' 
AND is_active = true 
ORDER BY created_at DESC 
LIMIT 1;

// Returns
{
    isPremium: subscription_status === 'premium' && is_active === true,
    subscription: { /* full subscription record */ },
    status: isPremium ? 'premium' : 'free'
}
```

### 3️⃣ Frontend Button Updates Based on Status

**Button Logic (`public/app.js` lines 804-834):**

```javascript
if (userSubscription.isPremium) {
    // User has active premium subscription
    button.text = '👑 Premium';
    button.disabled = true;
    button.classList.add('premium-active');
} else {
    // User is free or subscription inactive
    button.text = '⭐ Upgrade to Premium';
    button.disabled = false;
    button.classList.remove('premium-active');
}
```

## ✅ Verification Steps

### Step 1: Check Database Schema

Run in Supabase SQL Editor:
```sql
-- Verify table exists with correct columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;
```

Expected columns:
- ✅ `user_id` (text)
- ✅ `subscription_id` (text)
- ✅ `subscription_status` (text)
- ✅ `is_active` (boolean)
- ✅ `payment_id`, `session_id`, etc.

### Step 2: Test Webhook

1. **Click the "🔔 Test Webhook" button** in your app
2. **Check the modal results** - should show:
   - ✅ Status: "Webhook processed successfully!"
   - ✅ Response includes user_id and subscription data

3. **Verify in Supabase:**
```sql
-- Check your subscription record
SELECT 
    user_id,
    user_email,
    subscription_id,
    subscription_status,
    is_active,
    payment_id,
    created_at
FROM user_subscriptions 
WHERE user_id = '<your_firebase_uid>'
ORDER BY created_at DESC
LIMIT 1;
```

Expected result:
- ✅ `subscription_status` = `'premium'`
- ✅ `is_active` = `true`
- ✅ `subscription_id` starts with `'sub_TEST_'`

### Step 3: Verify Button Updates

**After webhook test completes:**

1. **Check browser console** (F12):
```
✅ User subscription status loaded: premium
📊 Subscription data: { isPremium: true, status: "premium", ... }
🔘 Updating premium button state...
👑 Setting button to PREMIUM state
```

2. **Check button appearance:**
   - Text should change to: **"👑 Premium"**
   - Button should be **disabled**
   - Button should have **premium-active** class

3. **Manual API Test** (in browser console):
```javascript
// Get auth token
const token = await auth.currentUser.getIdToken();

// Call subscription status API
const response = await fetch('/api/user/subscription-status', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
console.log('Subscription Status:', data);
```

Expected response:
```json
{
    "isPremium": true,
    "status": "premium",
    "subscription": {
        "user_id": "your_firebase_uid",
        "subscription_status": "premium",
        "is_active": true,
        "subscription_id": "sub_TEST_1234567890",
        ...
    }
}
```

## 🔄 Subscription States

| `subscription_status` | `is_active` | Button Display | Description |
|-----------------------|-------------|----------------|-------------|
| `'premium'` | `true` | 👑 Premium | Active premium subscription |
| `'premium'` | `false` | ⭐ Upgrade to Premium | Expired/cancelled premium |
| `'free'` | `true` | ⭐ Upgrade to Premium | Free user |
| `'free'` | `false` | ⭐ Upgrade to Premium | Free user |
| `'cancelled'` | `false` | ⭐ Upgrade to Premium | Cancelled subscription |
| `'expired'` | `false` | ⭐ Upgrade to Premium | Expired subscription |

**Key Rule:** Button shows **"👑 Premium"** ONLY when BOTH:
- ✅ `subscription_status === 'premium'`
- ✅ `is_active === true`

## 🧪 Testing Scenarios

### Scenario 1: New User (No Subscription)

```sql
-- User has no record in user_subscriptions
SELECT * FROM user_subscriptions WHERE user_id = 'new_user_uid';
-- Returns: No rows
```

**Expected:**
- Button: ⭐ Upgrade to Premium
- isPremium: false
- status: free

### Scenario 2: User Completes Payment

1. User clicks "Upgrade to Premium"
2. Completes payment on DODO Payments
3. Webhook receives `payment.succeeded` event
4. System creates/updates subscription record with `is_active: true`

**Expected:**
```sql
SELECT subscription_status, is_active FROM user_subscriptions 
WHERE user_id = 'paid_user_uid';
-- Returns: subscription_status = 'premium', is_active = true
```

- Button: 👑 Premium
- isPremium: true
- status: premium

### Scenario 3: Subscription Cancelled

Webhook receives `payment.cancelled` or `payment.failed`:

```sql
UPDATE user_subscriptions 
SET is_active = false, subscription_status = 'cancelled'
WHERE subscription_id = 'sub_XYZ';
```

**Expected:**
- Button: ⭐ Upgrade to Premium
- isPremium: false
- status: free

## 🐛 Troubleshooting

### Issue: Button Not Updating After Payment

**Check:**
1. ✅ Webhook was received (check server logs)
2. ✅ Database record created with `is_active: true`
3. ✅ Frontend called `/api/user/subscription-status`
4. ✅ Response has `isPremium: true`

**Fix:**
- Click "🔔 Test Webhook" to trigger manual update
- Check browser console for errors
- Verify auth token is valid
- Refresh page to reload subscription status

### Issue: Button Shows Premium But User Isn't Premium

**Check database:**
```sql
SELECT * FROM user_subscriptions 
WHERE user_id = '<user_id>' 
AND is_active = true;
```

If record exists but shouldn't:
```sql
-- Deactivate subscription
UPDATE user_subscriptions 
SET is_active = false 
WHERE user_id = '<user_id>';
```

Then refresh the page.

### Issue: Multiple Active Subscriptions

**Check:**
```sql
SELECT COUNT(*) FROM user_subscriptions 
WHERE user_id = '<user_id>' AND is_active = true;
```

**Fix:**
```sql
-- Keep only the latest subscription active
WITH latest_sub AS (
    SELECT id FROM user_subscriptions 
    WHERE user_id = '<user_id>'
    ORDER BY created_at DESC 
    LIMIT 1
)
UPDATE user_subscriptions 
SET is_active = false 
WHERE user_id = '<user_id>' 
AND id NOT IN (SELECT id FROM latest_sub);
```

## 📊 Monitoring Queries

### Active Premium Users
```sql
SELECT 
    user_email,
    subscription_id,
    subscription_start_date,
    amount,
    currency
FROM user_subscriptions 
WHERE subscription_status = 'premium' 
AND is_active = true
ORDER BY created_at DESC;
```

### Recent Subscription Changes
```sql
SELECT 
    user_email,
    subscription_status,
    is_active,
    updated_at,
    payment_id
FROM user_subscriptions 
ORDER BY updated_at DESC 
LIMIT 20;
```

### User's Subscription History
```sql
SELECT 
    subscription_status,
    is_active,
    payment_id,
    amount,
    created_at,
    updated_at
FROM user_subscriptions 
WHERE user_id = '<user_id>'
ORDER BY created_at DESC;
```

## 🎯 Summary

The subscription system works as follows:

1. ✅ Webhook updates `user_subscriptions` table with `is_active: true` and `subscription_status: 'premium'`
2. ✅ API endpoint checks the table for logged-in user where `is_active = true`
3. ✅ Button updates to "👑 Premium" when `isPremium === true`
4. ✅ Button shows "⭐ Upgrade to Premium" when `isPremium === false`

**Everything is already implemented and working!** Use the "🔔 Test Webhook" button to verify.

