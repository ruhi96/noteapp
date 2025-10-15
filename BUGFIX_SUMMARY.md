# 🐛 Bug Fixes Summary - Token Expiration & Database Issues

## Issues Fixed

### 1️⃣ Firebase Token Expiration Error ✅

**Problem:**
```
Auth verification error: Firebase ID token has expired. 
Get a fresh ID token from your client app and try again (auth/id-token-expired)
```

**Root Cause:**
- Firebase ID tokens expire after 60 minutes
- App wasn't refreshing tokens automatically
- Users who stayed logged in for >1 hour couldn't make API calls

**Solution:**
- ✅ Added automatic token refresh every 50 minutes
- ✅ Force token refresh on initial login with `getIdToken(true)`
- ✅ Created `getFreshToken()` helper with retry logic
- ✅ All API calls now handle 401 errors and retry with fresh token
- ✅ Token refresh interval clears on sign out

**Code Changes (`public/app.js`):**

```javascript
// Auto-refresh token every 50 minutes (before 60-minute expiration)
setupTokenRefresh() {
    this.tokenRefreshInterval = setInterval(async () => {
        if (this.currentUser) {
            this.authToken = await this.currentUser.getIdToken(true);
            console.log('✅ Token refreshed successfully');
        }
    }, 50 * 60 * 1000); // 50 minutes
}

// Helper to get fresh token with error handling
async getFreshToken() {
    this.authToken = await this.currentUser.getIdToken(true);
    return this.authToken;
}

// API calls now retry with fresh token if 401
if (response.status === 401) {
    await this.getFreshToken();
    response = await fetch(url, { /* retry with new token */ });
}
```

---

### 2️⃣ Webhook Not Saving to Supabase ✅

**Problem:**
- Webhook test showed "✅ Webhook processed successfully"
- BUT database wasn't being updated with subscription data
- `user_subscriptions` table remained empty

**Root Cause:**
- Webhook handlers were using `supabase` (anon key) instead of `supabaseService` (service role key)
- Row Level Security (RLS) policies were blocking inserts/updates
- Webhooks aren't authenticated users, so RLS denied access

**Solution:**
- ✅ Changed ALL webhook database operations to use `supabaseService`
- ✅ Service role key bypasses RLS policies
- ✅ Webhooks can now insert/update subscription records

**Code Changes (`server.js`):**

**Before:**
```javascript
// ❌ Using anon key - RLS blocks this
const { data, error } = await supabase
    .from('user_subscriptions')
    .insert([subscriptionRecord]);
```

**After:**
```javascript
// ✅ Using service role key - bypasses RLS
const { data, error } = await supabaseService
    .from('user_subscriptions')
    .insert([subscriptionRecord]);
```

**Functions Fixed:**
- ✅ `handlePaymentCompleted()` - creates/updates subscriptions
- ✅ `handlePaymentFailed()` - updates failed payments
- ✅ `handlePaymentCancelled()` - updates cancelled subscriptions
- ✅ Payment session lookups for user_id fallback

---

## Testing the Fixes

### Test Token Refresh

1. **Sign in to the app**
2. **Check browser console:**
   ```
   ⏰ Token auto-refresh set up (every 50 minutes)
   ```
3. **Wait 50 minutes (or modify the interval for testing):**
   ```
   🔄 Refreshing Firebase ID token...
   ✅ Token refreshed successfully
   ```
4. **Create a note after 1+ hours** - should work without errors

### Test Webhook Database Updates

1. **Click "🔔 Test Webhook" button**
2. **Check modal shows success**
3. **Verify in Supabase SQL Editor:**

```sql
-- Check subscription was created
SELECT 
    user_id,
    user_email,
    subscription_id,
    subscription_status,
    is_active,
    payment_id,
    created_at
FROM user_subscriptions 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Result:**
```
✅ Row exists with:
- subscription_id: sub_TEST_1234567890
- subscription_status: premium
- is_active: true
- user_id: <your Firebase UID>
- user_email: <your email>
```

4. **Check Premium Button Updates:**
   - After 2 seconds, button should change to "👑 Premium"
   - Button should be disabled

---

## Environment Variables Check

Make sure these are set in Render:

```bash
# Required for webhook database operations
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Service role key (not anon key!)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...  # Anon key

# Required for Firebase Auth
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id

# Required for DODO Payments
DODO_PAYMENTS_API_KEY=sk_...
DODO_PRODUCT_ID=prod_...
DODO_WEBHOOK_KEY=whk_...
```

**⚠️ Critical:** Make sure `SUPABASE_SERVICE_ROLE_KEY` is the **service role key**, NOT the anon key!

**Find it in Supabase:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy "service_role" key (keep secret!)

---

## Verification Checklist

After deploying to Render:

- [ ] Users can stay logged in for >1 hour without errors
- [ ] Creating notes works after extended sessions
- [ ] Webhook test creates subscription in database
- [ ] Premium button updates after webhook test
- [ ] No "auth/id-token-expired" errors in logs
- [ ] Subscription data visible in Supabase

---

## How Token Refresh Works

```
Login
  ↓
Get fresh token (force refresh)
  ↓
Start 50-minute timer
  ↓
Every 50 minutes:
  - Refresh token automatically
  - Update authToken variable
  ↓
On API call:
  - Use current authToken
  - If 401 error → get fresh token
  - Retry the request
  ↓
Sign out:
  - Clear token refresh timer
  - Clear authToken
```

---

## How Webhook Database Access Works

```
DODO Payments → Webhook
  ↓
Extract user_id (from metadata or payment_sessions)
  ↓
Use supabaseService (service role key)
  ↓
Bypass RLS policies
  ↓
Insert/update user_subscriptions table
  ↓
✅ Success
```

**Why Service Role Key?**
- Webhooks are server-to-server (no authenticated user)
- RLS policies block anonymous inserts
- Service role key bypasses RLS
- Safe because it's server-side only (never exposed to frontend)

---

## Commit Details

**Commit:** `9c9bf66`

**Changes:**
- `public/app.js` - Token refresh logic and retry mechanisms
- `server.js` - Webhook handlers use service role key

**Files Changed:** 2  
**Insertions:** +138  
**Deletions:** -24  

---

## Next Steps

1. **Deploy to Render** - changes will auto-deploy from GitHub
2. **Test webhook** - click "🔔 Test Webhook" button
3. **Verify database** - check Supabase for subscription record
4. **Monitor logs** - check for token refresh messages

---

## Support

If issues persist:

1. **Check Render logs** for detailed error messages
2. **Verify environment variables** are correctly set
3. **Test locally first** with `npm start`
4. **Check Supabase RLS policies** if database issues continue

**Related Docs:**
- `SUBSCRIPTION_VERIFICATION.md` - Subscription testing guide
- `WEBHOOK_TESTING.md` - Webhook setup and testing
- Firebase Auth Docs: https://firebase.google.com/docs/auth/admin/verify-id-tokens

