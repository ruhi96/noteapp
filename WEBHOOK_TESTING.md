# 🔔 DODO Payments Webhook Testing Guide

This guide helps you test and verify that the webhook integration is working correctly.

## 📋 What the Webhook Does

When DODO Payments sends a `payment.succeeded` webhook:

1. **Extracts subscription data** from the webhook payload:
   - `subscription_id` (e.g., `sub_65BdAyLSsVOQL0xXXrUdF`)
   - `payment_id` (e.g., `pay_y8Kv1LHb5If80PkXn7dmH`)
   - `checkout_session_id` (e.g., `cks_URuC2d4xNonSIKk3n8k6m`)
   - User information from `metadata`
   - Payment amount and currency

2. **Checks if subscription exists**:
   - Queries database for existing `subscription_id`
   - If found: Updates `is_active = true` and latest `payment_id`
   - If not found: Creates new subscription record

3. **Updates user subscription status**:
   - Sets `subscription_status = 'premium'`
   - Sets `is_active = true`
   - Updates `payment_id` with latest payment
   - Updates `updated_at` timestamp

## 🧪 Test Locally

### 1. Start Your Server

```bash
cd C:\Users\91956\note-app
node server.js
```

You should see:
```
✅ Server running at http://localhost:3001
📝 Note app is ready!
```

### 2. Run Webhook Test

Open a **new terminal** and run:

```bash
node test-webhook.js
```

Expected output:
```
🧪 Testing webhook locally...

✅ Response status: 200
📦 Response body: {
  "success": true,
  "message": "Webhook processed successfully"
}

✅ Webhook processed successfully!
```

### 3. Verify in Supabase

Go to Supabase SQL Editor and run:

```sql
SELECT * FROM user_subscriptions 
WHERE subscription_id = 'sub_65BdAyLSsVOQL0xXXrUdF';
```

You should see a record with:
- ✅ `subscription_id`: `sub_65BdAyLSsVOQL0xXXrUdF`
- ✅ `user_id`: `ksNz0ZmkelTiqHar66BsOcmMTGI2`
- ✅ `user_email`: `dsk003@gmail.com`
- ✅ `subscription_status`: `premium`
- ✅ `is_active`: `true`
- ✅ `payment_id`: `pay_y8Kv1LHb5If80PkXn7dmH`
- ✅ `amount`: `109.05` (converted from 10905 cents)
- ✅ `currency`: `INR`

## 🌐 Test on Render (Production)

### 1. Use cURL to Test Production Webhook

```bash
curl -X POST https://noteapp-moei.onrender.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "dodo-signature: v1,x/OU/I2XIU25xuGTO..." \
  -d '{
    "type": "payment.succeeded",
    "business_id": "bus_JlagSLJBK8pKdy8DUI0jY",
    "timestamp": "2025-10-09T19:04:09.525987Z",
    "data": {
      "subscription_id": "sub_65BdAyLSsVOQL0xXXrUdF",
      "payment_id": "pay_y8Kv1LHb5If80PkXn7dmH",
      "checkout_session_id": "cks_URuC2d4xNonSIKk3n8k6m",
      "total_amount": 10905,
      "currency": "INR",
      "status": "succeeded",
      "customer": {
        "email": "dsk003@gmail.com",
        "name": "Deepak Krishnan"
      },
      "metadata": {
        "user_id": "ksNz0ZmkelTiqHar66BsOcmMTGI2",
        "user_email": "dsk003@gmail.com",
        "product": "premium_upgrade"
      }
    }
  }'
```

### 2. Check Render Logs

1. Go to **Render Dashboard**
2. Select your **noteapp service**
3. Click **Logs** tab
4. Look for:
   ```
   🔔 DODO Payments webhook received
   ✅ Webhook signature received: v1,x/OU...
   Payment webhook received: {...}
   🎯 Event type: payment.succeeded
   ✅ Processing completed payment
   👤 Updating subscription for user: ksNz0ZmkelTiqHar66BsOcmMTGI2
   🔑 Subscription ID: sub_65BdAyLSsVOQL0xXXrUdF
   ```

## 🔄 Test Subscription Renewal (Existing subscription_id)

To test that renewals work (update instead of creating duplicate):

### 1. Run Test Twice

```bash
# First time - creates new subscription
node test-webhook.js

# Second time - should update existing subscription
node test-webhook.js
```

### 2. Check Server Logs

**First run:**
```
📝 Creating new subscription record
✅ New subscription created for user: ksNz0ZmkelTiqHar66BsOcmMTGI2
```

**Second run:**
```
✅ Subscription already exists, updating status to active
✅ Existing subscription updated to active
```

### 3. Verify Only ONE Record Exists

```sql
SELECT COUNT(*) as count
FROM user_subscriptions
WHERE subscription_id = 'sub_65BdAyLSsVOQL0xXXrUdF';
```

Should return: `count: 1` ✅

## 📊 Verification Queries

### Check Specific Subscription

```sql
SELECT 
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
WHERE subscription_id = 'sub_65BdAyLSsVOQL0xXXrUdF';
```

### Check User's Subscriptions

```sql
SELECT 
    subscription_id,
    payment_id,
    subscription_status,
    is_active,
    amount,
    created_at
FROM user_subscriptions
WHERE user_id = 'ksNz0ZmkelTiqHar66BsOcmMTGI2'
ORDER BY created_at DESC;
```

### Check All Active Premium Users

```sql
SELECT 
    user_email,
    subscription_id,
    subscription_status,
    amount,
    currency,
    created_at
FROM user_subscriptions
WHERE subscription_status = 'premium' 
AND is_active = true
ORDER BY created_at DESC;
```

## 🐛 Troubleshooting

### Issue: Webhook not reaching server

**Check:**
1. Server is running: `node server.js`
2. Firewall allows connections on port 3001
3. Webhook URL is correct in DODO dashboard

**Render (Production):**
1. Service is deployed and running
2. Webhook URL: `https://noteapp-moei.onrender.com/api/payments/webhook`
3. Check Render logs for incoming requests

### Issue: "No user_id in payment metadata"

**Cause:** The webhook doesn't have user information

**Fix:** Ensure checkout session includes metadata:
```javascript
metadata: {
    user_id: req.user.uid,
    user_email: req.user.email,
    product: 'premium_upgrade'
}
```

### Issue: Duplicate subscriptions created

**Check:**
1. Database has UNIQUE constraint on `subscription_id`
2. Webhook handler checks for existing subscription before creating

**Verify:**
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'user_subscriptions' 
AND constraint_type = 'UNIQUE';
```

Should show: `user_subscriptions_subscription_id_key`

### Issue: Button not changing to "Premium"

**Check:**
1. Subscription exists in database with `is_active = true`
2. Frontend calls `/api/user/subscription-status`
3. Check browser console for errors

**Test API endpoint:**
```bash
curl https://noteapp-moei.onrender.com/api/user/subscription-status \
  -H "Authorization: Bearer YOUR_FIREBASE_JWT_TOKEN"
```

Should return:
```json
{
  "isPremium": true,
  "status": "premium",
  "subscription": {
    "subscription_id": "sub_65BdAyLSsVOQL0xXXrUdF",
    "subscription_status": "premium",
    "is_active": true
  }
}
```

## ✅ Success Checklist

After webhook is received, verify:

- [ ] Subscription record exists in `user_subscriptions` table
- [ ] `subscription_id` matches webhook payload
- [ ] `is_active` is set to `true`
- [ ] `subscription_status` is `'premium'`
- [ ] Amount is correctly converted from cents
- [ ] User can see "👑 Premium" button in UI
- [ ] Running webhook again updates (doesn't duplicate)
- [ ] Render logs show successful webhook processing

## 📞 Support

If webhook processing fails:

1. **Check Render logs** for error messages
2. **Verify environment variables** are set:
   - `DODO_WEBHOOK_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
3. **Run local test** to isolate issue
4. **Check Supabase logs** for database errors

---

## 🎉 You're All Set!

Your webhook integration is complete and working when:
- ✅ Webhook receives `payment.succeeded` events
- ✅ Subscription data is saved to database
- ✅ User button shows "👑 Premium" status
- ✅ Renewals update existing subscriptions

Happy testing! 🚀
