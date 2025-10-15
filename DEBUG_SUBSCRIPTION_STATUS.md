# 🐛 Debug: Button Not Changing to Premium

## Issue
- ✅ Data is in `user_subscriptions` table
- ✅ `subscription_status = 'premium'`
- ✅ `is_active = true`
- ❌ Button NOT changing to "👑 Premium"

---

## 🔍 Step-by-Step Debugging

### Step 1: Verify Database Has Correct Data

Run in **Supabase SQL Editor:**

```sql
-- Check your subscription (replace with your email)
SELECT 
    user_id,
    user_email,
    subscription_status,
    is_active,
    subscription_id,
    created_at
FROM user_subscriptions 
WHERE user_email = 'your-email@example.com'  -- ← CHANGE THIS
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
```
subscription_status: premium  ✅
is_active: true              ✅
```

---

### Step 2: Test API Endpoint Directly

Open **Browser Console** (F12) on https://noteapp-moei.onrender.com/ while logged in:

```javascript
// Get fresh auth token
const token = await auth.currentUser.getIdToken(true);
console.log('🔑 Token:', token.substring(0, 30) + '...');

// Call subscription status API
const response = await fetch('/api/user/subscription-status', {
    headers: { 'Authorization': `Bearer ${token}` }
});

// Check response
console.log('📊 Status:', response.status);
const data = await response.json();
console.log('📦 Response:', data);
```

**Expected Output:**
```javascript
{
  isPremium: true,           // ← Should be true
  status: "premium",         // ← Should be "premium"
  subscription: {
    user_id: "QLbUfs9...",
    subscription_status: "premium",
    is_active: true,
    ...
  }
}
```

**If `isPremium: false`** → API query is failing (see Step 3)

---

### Step 3: Check Server Logs

Go to **Render Dashboard** → Your Service → **Logs**

Look for when you call the API:

```
📊 Getting subscription status for user: QLbUfs9JCXRboUoqXKYGT3omFlO2
```

**Then look for:**

✅ **Good:**
```
✅ User subscription status loaded: premium
```

❌ **Bad:**
```
❌ Error fetching subscription status: ...
```

---

### Step 4: Check user_id Match

The most common issue is **user_id mismatch** between Firebase and database.

**In Browser Console:**
```javascript
// Get Firebase user_id
const firebaseUserId = auth.currentUser.uid;
console.log('🔥 Firebase UID:', firebaseUserId);
```

**In Supabase SQL:**
```sql
-- Check what user_id is in database
SELECT user_id FROM user_subscriptions 
WHERE user_email = 'your-email@example.com';
```

**These MUST match exactly!** If they don't, that's your problem.

---

### Step 5: Check Frontend is Calling loadUserSubscriptionStatus

**In Browser Console**, look for these logs:

```
📊 Checking subscription status...
✅ User subscription status loaded: premium
🔘 Updating premium button state...
👑 Setting button to PREMIUM state
```

**If missing** → Frontend not calling the function

---

## 🔧 Common Fixes

### Fix 1: User ID Mismatch

**Problem:** Database has different user_id than Firebase

**Solution:** Update the user_id in database

```sql
-- Find the wrong record
SELECT id, user_id, user_email FROM user_subscriptions 
WHERE user_email = 'your-email@example.com';

-- Update with correct Firebase UID (get from browser console)
UPDATE user_subscriptions 
SET user_id = 'QLbUfs9JCXRboUoqXKYGT3omFlO2'  -- ← Your Firebase UID
WHERE user_email = 'your-email@example.com';
```

---

### Fix 2: RLS Policy Blocking Query

**Problem:** Row Level Security preventing query

**Test:** Query with service role key in server.js

**Temporary fix:** Change line 637 in server.js:

```javascript
// FROM:
const { data: subscription, error } = await supabase

// TO:
const { data: subscription, error } = await supabaseService
```

Then redeploy and test.

---

### Fix 3: Frontend Not Checking After Login

**Problem:** Frontend doesn't call loadUserSubscriptionStatus on login

**Add this to browser console to force check:**
```javascript
// Manually trigger subscription check
const app = new NoteApp();
await app.loadUserSubscriptionStatus();
```

If button changes, then the issue is the auto-check isn't running.

---

### Fix 4: Stale Token

**Problem:** Old Firebase token not recognized

**Solution:** Force token refresh

```javascript
// In browser console
const freshToken = await auth.currentUser.getIdToken(true);  // force refresh
console.log('Token refreshed');

// Then try API again
const response = await fetch('/api/user/subscription-status', {
    headers: { 'Authorization': `Bearer ${freshToken}` }
});
console.log(await response.json());
```

---

## 🧪 Quick Test Script

Run this **complete test** in browser console:

```javascript
(async function testSubscription() {
    console.log('🧪 Starting subscription test...\n');
    
    // 1. Check if logged in
    if (!auth.currentUser) {
        console.error('❌ Not logged in!');
        return;
    }
    console.log('✅ Logged in as:', auth.currentUser.email);
    console.log('🔑 Firebase UID:', auth.currentUser.uid);
    
    // 2. Get fresh token
    const token = await auth.currentUser.getIdToken(true);
    console.log('✅ Got fresh token');
    
    // 3. Call API
    const response = await fetch('/api/user/subscription-status', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📊 API Status:', response.status);
    
    if (!response.ok) {
        console.error('❌ API Error:', await response.text());
        return;
    }
    
    // 4. Check response
    const data = await response.json();
    console.log('📦 API Response:', data);
    
    // 5. Verify isPremium
    if (data.isPremium) {
        console.log('✅ User IS premium');
        console.log('👑 Button SHOULD show "Premium"');
    } else {
        console.log('❌ User is NOT premium');
        console.log('Subscription data:', data.subscription);
        
        if (data.subscription) {
            console.log('⚠️ Subscription exists but isPremium is false!');
            console.log('   Status:', data.subscription.subscription_status);
            console.log('   Active:', data.subscription.is_active);
        } else {
            console.log('❌ No subscription found for user');
        }
    }
    
    // 6. Check button state
    const btn = document.getElementById('upgradePremiumBtn');
    if (btn) {
        console.log('🔘 Current button text:', btn.textContent);
        console.log('🔘 Button disabled:', btn.disabled);
    }
    
    console.log('\n🧪 Test complete!');
})();
```

---

## 🎯 Most Likely Issues (In Order)

1. **User ID Mismatch (70% of cases)**
   - Firebase UID ≠ Database user_id
   - Check Step 4 above

2. **Frontend Not Calling API (20%)**
   - Button update function not running
   - Check browser console logs

3. **RLS Policy Blocking (5%)**
   - Supabase RLS preventing read
   - Use supabaseService instead

4. **Stale Token (5%)**
   - Old Firebase token
   - Force refresh

---

## ✅ After Fixing

You should see:

**In Browser Console:**
```
📊 Checking subscription status...
✅ User subscription status loaded: premium
📊 Subscription data: { isPremium: true, status: "premium", ... }
🔘 Updating premium button state...
👑 Setting button to PREMIUM state
```

**Button Display:**
```
Text: "👑 Premium"
Disabled: true
Class: premium-active
```

---

## 📞 Still Not Working?

Share these outputs:

1. **SQL Query Result** (Step 1)
2. **Browser Console Output** (Step 2)
3. **Server Logs** (Step 3)
4. **Test Script Output** (Quick Test)

This will show exactly where the problem is!

