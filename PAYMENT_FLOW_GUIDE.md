# 💳 Payment Flow & Subscription Status Guide

## Complete Payment Flow

```
User clicks "Upgrade to Premium"
         ↓
Backend creates checkout session
- Stores session in payment_sessions table
- Includes metadata: { user_id, user_email }
         ↓
User redirected to DODO Payments
         ↓
User completes payment
         ↓
┌─────────────────────────────────────┐
│  TWO THINGS HAPPEN SIMULTANEOUSLY:  │
└─────────────────────────────────────┘
         ↓                    ↓
    WEBHOOK PATH          REDIRECT PATH
         ↓                    ↓
```

---

## 🔔 Webhook Path (Server-Side)

**1. DODO Payments → Webhook**

**Endpoint:** `POST /api/payments/webhook`

**Payload Example:**
```json
{
  "type": "payment.succeeded",
  "business_id": "bus_TEST123",
  "timestamp": "2025-10-15T15:00:48.387Z",
  "data": {
    "subscription_id": "sub_TEST_1760540448387",
    "payment_id": "pay_TEST_1760540448387",
    "checkout_session_id": "cks_TEST_1760540448387",
    "total_amount": 10905,
    "currency": "INR",
    "status": "succeeded",
    "customer": {
      "email": "rruhisingh@gmail.com",
      "name": "Ruhi Singh"
    },
    "metadata": {
      "user_id": "QLbUfs9JCXRboUoqXKYGT3omFlO2",
      "user_email": "rruhisingh@gmail.com",
      "source": "webhook_test",
      "timestamp": "2025-10-15T15:00:48.388Z"
    }
  }
}
```

**2. Server Updates Database**

Using `supabaseService` (service role key), the webhook handler:

```javascript
// Insert or update user_subscriptions table
await supabaseService
    .from('user_subscriptions')
    .insert([{
        user_id: metadata.user_id,           // QLbUfs9JCXRboUoqXKYGT3omFlO2
        user_email: customer.email,          // rruhisingh@gmail.com
        subscription_id: subscription_id,     // sub_TEST_1760540448387
        subscription_status: 'premium',       // 'premium'
        is_active: true,                      // true
        payment_id: payment_id,
        amount: total_amount / 100,
        currency: currency,
        // ... other fields
    }]);
```

**Result in Supabase:**
```sql
-- user_subscriptions table updated
user_id: QLbUfs9JCXRboUoqXKYGT3omFlO2
user_email: rruhisingh@gmail.com
subscription_status: premium
is_active: true
subscription_id: sub_TEST_1760540448387
```

---

## 🔄 Redirect Path (Frontend)

**1. User Redirected Back to App**

**URL:** `https://noteapp-moei.onrender.com/?payment=success`

**2. Frontend Detects Payment Success**

```javascript
// app.js - handlePaymentRedirects()
const urlParams = new URLSearchParams(window.location.search);
const paymentStatus = urlParams.get('payment');

if (paymentStatus === 'success') {
    // Show success message
    this.showSuccessMessage('🎉 Welcome to Premium!');
    
    // Wait for webhook to process (retry mechanism)
    this.waitForSubscriptionActivation();
}
```

**3. Check Subscription Status (With Retries)**

```javascript
// Retry up to 10 times, every 3 seconds
async waitForSubscriptionActivation() {
    for (let attempt = 1; attempt <= 10; attempt++) {
        const subscriptionData = await this.loadUserSubscriptionStatus();
        
        if (subscriptionData && subscriptionData.isPremium) {
            // ✅ Subscription is active!
            this.updatePremiumButton(); // Change to "👑 Premium"
            return;
        }
        
        await sleep(3000); // Wait 3 seconds before retry
    }
}
```

**4. API Call to Check Status**

**Endpoint:** `GET /api/user/subscription-status`

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**NO userId in query params** - User is identified by Firebase JWT token (secure!)

**Response Format:**
```json
{
  "isPremium": true,
  "status": "premium",
  "subscription": {
    "id": "uuid-here",
    "user_id": "QLbUfs9JCXRboUoqXKYGT3omFlO2",
    "user_email": "rruhisingh@gmail.com",
    "subscription_id": "sub_TEST_1760540448387",
    "subscription_status": "premium",
    "is_active": true,
    "payment_id": "pay_TEST_1760540448387",
    "amount": 109.05,
    "currency": "INR",
    "created_at": "2025-10-15T15:00:48.387Z",
    "updated_at": "2025-10-15T15:00:48.387Z"
  }
}
```

**5. Update Premium Button**

```javascript
updatePremiumButton() {
    if (this.userSubscription && this.userSubscription.isPremium) {
        // User has active premium subscription
        button.textContent = '👑 Premium';
        button.disabled = true;
        button.classList.add('premium-active');
    } else {
        // User is free
        button.textContent = '⭐ Upgrade to Premium';
        button.disabled = false;
    }
}
```

---

## 🔐 Security: Why NOT Use `?userId=` Query Parameter?

**❌ BAD (Insecure):**
```
GET /api/user/subscription-status?userId=QLbUfs9JCXRboUoqXKYGT3omFlO2
```

**Problems:**
1. Anyone can query ANY user's subscription status
2. No authentication - anyone can check if user X is premium
3. Privacy violation - subscription status is sensitive data
4. Can be exploited to enumerate users

**✅ GOOD (Secure - Current Implementation):**
```
GET /api/user/subscription-status
Authorization: Bearer <firebase_jwt_token>
```

**Benefits:**
1. User is identified by verified JWT token
2. Only logged-in user can check their own status
3. Backend extracts user_id from verified token
4. No way to check other users' status

**Server Code:**
```javascript
app.get('/api/user/subscription-status', authenticateUser, async (req, res) => {
    // Extract user_id from verified JWT token
    const userId = req.user.uid; // From Firebase token, not query param!
    
    // Query database for THIS user only
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)  // Secure - can only query own data
        .eq('is_active', true)
        .single();
    
    res.json({
        isPremium: subscription?.subscription_status === 'premium',
        subscription: subscription
    });
});
```

---

## 📊 Complete Data Flow Diagram

```
PAYMENT FLOW:
═══════════════════════════════════════════════════════════

1. CREATE CHECKOUT
   Frontend → POST /api/payments/create-checkout
              (with Firebase JWT token)
              ↓
              Stores in payment_sessions table:
              {
                user_id: "QLbUfs9JCXRboUoqXKYGT3omFlO2",
                session_id: "cks_XXX",
                user_email: "user@example.com"
              }

2. USER PAYS
   Browser → DODO Payments Checkout
             ↓
             Payment Success
             ↓
        ┌────────┴────────┐
        ↓                 ↓
   WEBHOOK           REDIRECT
   (async)           (immediate)

3a. WEBHOOK UPDATES DATABASE
    DODO → POST /api/payments/webhook
           {
             type: "payment.succeeded",
             data: {
               subscription_id: "sub_XXX",
               metadata: { user_id: "..." }
             }
           }
           ↓
           Server extracts user_id from metadata
           OR looks up from payment_sessions table
           ↓
           UPDATE user_subscriptions:
           {
             user_id: "QLbUfs9JCXRboUoqXKYGT3omFlO2",
             subscription_status: "premium",
             is_active: true
           }

3b. REDIRECT TO APP
    Browser → https://noteapp.com/?payment=success
              ↓
              Frontend detects ?payment=success
              ↓
              Waits for webhook processing (retry loop)
              ↓
              Calls GET /api/user/subscription-status
              (with Firebase JWT token)
              ↓
              Server queries user_subscriptions
              WHERE user_id = <from JWT token>
              AND is_active = true
              ↓
              Returns: { isPremium: true }
              ↓
              Button updates to "👑 Premium"

═══════════════════════════════════════════════════════════
```

---

## 🧪 Testing the Flow

### Test Complete Payment Flow

1. **Sign in to app**
2. **Click "⭐ Upgrade to Premium"**
3. **Complete mock payment on DODO Payments**
4. **Watch what happens:**

**Expected Sequence:**
```
1. Redirected to: https://noteapp.com/?payment=success
   ✅ Success message appears

2. Console logs (every 3 seconds):
   🔄 Checking subscription status (attempt 1/10)
   🔄 Checking subscription status (attempt 2/10)
   ...
   🎉 Subscription is now active! Button should update.

3. Button changes:
   ⭐ Upgrade to Premium → 👑 Premium
   (Button becomes disabled)

4. Database verification:
   SELECT * FROM user_subscriptions 
   WHERE user_id = '<your_firebase_uid>';
   
   Result:
   ✅ subscription_status: premium
   ✅ is_active: true
```

### Test Subscription Check on Login

1. **Close browser tab**
2. **Reopen app and sign in**
3. **Expected:**
   - Button immediately shows "👑 Premium"
   - No upgrade flow needed

**How it works:**
```javascript
// On successful authentication
async handleAuthenticatedUser(user) {
    this.currentUser = user;
    
    // Check subscription status
    await this.loadUserSubscriptionStatus();
    
    // Button updates automatically
    this.updatePremiumButton();
}
```

---

## 🔍 Debugging Subscription Issues

### Issue: Button Not Updating After Payment

**Check 1: Webhook Received?**
```bash
# Check Render logs
Webhook received: { type: "payment.succeeded" }
✅ New subscription created successfully
```

**Check 2: Database Updated?**
```sql
SELECT * FROM user_subscriptions 
WHERE user_id = '<your_firebase_uid>'
ORDER BY created_at DESC 
LIMIT 1;
```

Expected:
- ✅ Row exists
- ✅ `subscription_status = 'premium'`
- ✅ `is_active = true`

**Check 3: API Response Correct?**
```javascript
// In browser console
const token = await auth.currentUser.getIdToken();
const res = await fetch('/api/user/subscription-status', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const data = await res.json();
console.log(data);
```

Expected:
```json
{
  "isPremium": true,
  "status": "premium",
  "subscription": { ... }
}
```

**Check 4: Frontend Calling API?**
```javascript
// In browser console, check for these logs:
📊 Checking subscription status...
✅ User subscription status loaded: premium
🔘 Updating premium button state...
👑 Setting button to PREMIUM state
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Using userId in Query Param
```javascript
// DON'T DO THIS (insecure!)
fetch(`/api/user/subscription-status?userId=${userId}`)
```

### ✅ Correct: Use JWT Token
```javascript
// DO THIS (secure!)
fetch('/api/user/subscription-status', {
    headers: { 'Authorization': `Bearer ${authToken}` }
})
```

### ❌ Mistake 2: Confusing Webhook Payload with API Response

**Webhook Payload** (what DODO sends to server):
```json
{ "type": "payment.succeeded", "data": { ... } }
```

**API Response** (what frontend receives):
```json
{ "isPremium": true, "status": "premium", "subscription": { ... } }
```

These are DIFFERENT!

### ❌ Mistake 3: Not Waiting for Webhook

```javascript
// DON'T immediately check after redirect
// Webhook might still be processing
checkSubscription(); // ❌ Too early!
```

### ✅ Correct: Wait with Retries
```javascript
// DO use retry mechanism
waitForSubscriptionActivation(); // ✅ Retries every 3 seconds
```

---

## 📝 Summary

**Key Points:**
1. ✅ User identified by **Firebase JWT token**, NOT query param
2. ✅ Webhook updates `user_subscriptions` table with `subscription_status: 'premium'`
3. ✅ API endpoint `/api/user/subscription-status` checks table
4. ✅ Frontend polls with retries after payment redirect
5. ✅ Button updates to "👑 Premium" when `isPremium: true`

**This is already fully implemented and working!**

