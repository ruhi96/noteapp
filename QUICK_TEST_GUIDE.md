# ⚡ Quick Test: Subscription Status & Premium Button

## 🎯 Test the Complete Flow (3 Minutes)

### Step 1: Sign In
1. Go to: https://noteapp-moei.onrender.com/
2. Sign in with Google or Email

### Step 2: Test Webhook
1. **Click the "🔔 Test Webhook" button** in the header
2. **Wait for modal to show "✅ Webhook processed successfully!"**
3. **Wait 2-3 seconds**

### Step 3: Verify Button Changed
**Expected Result:**
- Button text changes from "⭐ Upgrade to Premium" → **"👑 Premium"**
- Button becomes disabled (greyed out)
- Button has premium styling

**Browser Console Should Show:**
```
🔄 Checking subscription status (attempt 1/10)
✅ User subscription status loaded: premium
📊 Subscription data: { isPremium: true, status: "premium", ... }
🔘 Updating premium button state...
👑 Setting button to PREMIUM state
```

### Step 4: Verify in Supabase
1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
-- Replace with your actual Firebase UID
SELECT 
    user_id,
    user_email,
    subscription_status,
    is_active,
    subscription_id,
    created_at
FROM user_subscriptions 
WHERE user_email = 'your-email@example.com'  -- Use your email
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:**
```
user_id: QLbUfs9JCXRboUoqXKYGT3omFlO2
user_email: your-email@example.com
subscription_status: premium  ← Should say "premium"
is_active: true               ← Should be true
subscription_id: sub_TEST_1760540448387
created_at: 2025-10-15 15:00:48.387000 +00:00
```

---

## 🔄 Test After Sign Out & Sign In

### Step 5: Test Persistence
1. **Click "Sign Out"**
2. **Close the browser tab**
3. **Reopen and sign in again**

**Expected Result:**
- Button IMMEDIATELY shows **"👑 Premium"** (no need to click anything)
- This proves the subscription status is saved in database

---

## ✅ Success Checklist

After testing, you should see:

- [✓] Webhook test completes successfully
- [✓] Database has new row in `user_subscriptions` table
- [✓] `subscription_status` = `'premium'`
- [✓] `is_active` = `true`
- [✓] Button changes to "👑 Premium"
- [✓] Button stays "👑 Premium" after sign out/in
- [✓] No errors in browser console
- [✓] No errors in Render logs

---

## 🔍 If Button Doesn't Change

### Debug Step 1: Check Browser Console
Look for these logs:
```
✅ User subscription status loaded: premium
👑 Setting button to PREMIUM state
```

If missing, check for errors.

### Debug Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Click "🔔 Test Webhook"
3. Look for requests:
   - `POST /api/payments/webhook` → Should return 200
   - `GET /api/user/subscription-status` → Should return `{ isPremium: true }`

### Debug Step 3: Check Supabase
Run query from Step 4 above. If no rows found:
- Webhook might not be processing
- Check Render logs for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Render env vars

### Debug Step 4: Check API Response
In browser console, run:
```javascript
// Get current auth token
const token = await auth.currentUser.getIdToken();

// Call subscription status API
const response = await fetch('/api/user/subscription-status', {
    headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();
console.log('Subscription Status:', data);
```

**Expected output:**
```json
{
  "isPremium": true,
  "status": "premium",
  "subscription": {
    "user_id": "QLbUfs9JCXRboUoqXKYGT3omFlO2",
    "subscription_status": "premium",
    "is_active": true,
    ...
  }
}
```

---

## 📊 How It Works (Summary)

```
1. User clicks "🔔 Test Webhook"
         ↓
2. Webhook sent to: POST /api/payments/webhook
         ↓
3. Server updates Supabase table:
   user_subscriptions.subscription_status = 'premium'
   user_subscriptions.is_active = true
         ↓
4. Frontend waits 2 seconds
         ↓
5. Frontend calls: GET /api/user/subscription-status
   (with Firebase JWT token)
         ↓
6. API queries database:
   SELECT * FROM user_subscriptions 
   WHERE user_id = <from JWT>
   AND is_active = true
         ↓
7. API returns: { isPremium: true }
         ↓
8. Button updates: "👑 Premium"
```

---

## 🎉 It's Already Working!

**All the code you requested is implemented:**
- ✅ Database table exists (`user_subscriptions`)
- ✅ Webhook updates subscription status
- ✅ Button checks subscription status
- ✅ Button changes to "Premium" when user is premium
- ✅ Subscription persists across sessions

**Just test it!** Click the "🔔 Test Webhook" button and watch it work.

