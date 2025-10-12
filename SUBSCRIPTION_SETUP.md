# 📊 User Subscription Status Setup Guide

This guide explains how to set up user subscription status tracking with DODO Payments webhook integration.

## 🗄️ Database Setup

### 1. Create User Subscriptions Table

Run the SQL script in your Supabase SQL Editor:

```sql
-- Run the complete user-subscriptions-schema.sql file
```

This creates:
- `user_subscriptions` table with all necessary fields
- Indexes for optimal performance
- RLS policies for security
- Helper functions for subscription management
- Analytics view for subscription data

### 2. Verify Table Creation

Check that the table was created successfully:

```sql
SELECT * FROM user_subscriptions LIMIT 1;
```

## 🔗 Environment Variables

### Required Environment Variables

Add these to your `.env` file and Render deployment:

```env
# DODO Payments Configuration
DODO_PAYMENTS_API_KEY=your_actual_dodo_payments_api_key
DODO_PRODUCT_ID=your_actual_dodo_product_id
DODO_WEBHOOK_KEY=your_actual_dodo_webhook_key
```

### Render Environment Variables

In your Render dashboard, add these environment variables:

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `DODO_PAYMENTS_API_KEY` | Your DODO Payments API key | `dodo_test_1234567890abcdef` |
| `DODO_PRODUCT_ID` | Your DODO product ID | `prod_1234567890` |
| `DODO_WEBHOOK_KEY` | Your DODO webhook secret key | `whsec_1234567890abcdef` |

## 🔔 Webhook Configuration

### 1. Configure DODO Payments Webhook

In your DODO Payments dashboard:

1. Go to **Webhooks** section
2. Add new webhook with URL: `https://noteapp-moei.onrender.com/api/payments/webhook`
3. Select events:
   - `payment.completed`
   - `payment.failed`
   - `payment.cancelled`
   - `checkout.completed`
   - `checkout.failed`
   - `checkout.cancelled`
4. Set webhook secret key (use this as `DODO_WEBHOOK_KEY`)

### 2. Test Webhook

Use a tool like ngrok to test webhooks locally:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3001

# Update webhook URL in DODO dashboard to use ngrok URL
```

## 🎯 API Endpoints

### New Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/webhook` | POST | Handles DODO Payments webhook notifications |
| `/api/user/subscription-status` | GET | Returns current user's subscription status |

### Webhook Endpoint Details

**URL:** `POST /api/payments/webhook`

**Headers:**
```
Content-Type: application/json
x-dodo-signature: your_webhook_key (optional)
```

**Payload Example:**
```json
{
  "event_type": "payment.completed",
  "data": {
    "session_id": "sess_1234567890",
    "payment_id": "pay_1234567890",
    "amount": 9.99,
    "currency": "USD",
    "customer": {
      "email": "user@example.com",
      "name": "John Doe"
    },
    "metadata": {
      "user_id": "firebase_uid_123",
      "user_email": "user@example.com",
      "product_id": "prod_1234567890"
    }
  }
}
```

### Subscription Status Endpoint

**URL:** `GET /api/user/subscription-status`

**Headers:**
```
Authorization: Bearer firebase_jwt_token
```

**Response:**
```json
{
  "isPremium": true,
  "status": "premium",
  "subscription": {
    "id": "uuid",
    "user_id": "firebase_uid",
    "subscription_status": "premium",
    "subscription_type": "premium",
    "is_active": true,
    "subscription_start_date": "2024-01-01T00:00:00Z"
  }
}
```

## 🎨 Frontend Integration

### Button State Changes

The upgrade button automatically changes based on subscription status:

**Free User:**
- Text: "⭐ Upgrade to Premium"
- Action: Opens DODO Payments checkout
- Style: Pink gradient with hover effects

**Premium User:**
- Text: "👑 Premium"
- Action: Disabled (no click action)
- Style: Green gradient with pulsing animation

### Automatic Updates

The subscription status is automatically updated:
1. **On login** - Checks current subscription status
2. **After payment** - Reloads status after successful payment redirect
3. **Via webhook** - Real-time updates when payment completes

## 🔒 Security Features

### Webhook Verification

- Optional webhook signature verification using `DODO_WEBHOOK_KEY`
- Validates webhook authenticity before processing
- Logs all webhook events for debugging

### Database Security

- Row Level Security (RLS) enabled on `user_subscriptions` table
- Users can only access their own subscription data
- System functions require authentication

### API Security

- All subscription endpoints require Firebase authentication
- JWT token validation for user identification
- CORS protection for webhook endpoints

## 📊 Subscription Analytics

### Available Data

The system tracks:
- Total subscriptions by date
- Revenue by subscription type
- User subscription lifecycle
- Payment success/failure rates

### Query Examples

```sql
-- Get subscription analytics
SELECT * FROM subscription_analytics ORDER BY date DESC;

-- Get user's subscription history
SELECT * FROM user_subscriptions 
WHERE user_id = 'firebase_uid' 
ORDER BY created_at DESC;

-- Get active premium users
SELECT COUNT(*) as premium_users 
FROM user_subscriptions 
WHERE subscription_status = 'premium' AND is_active = true;
```

## 🚀 Deployment Checklist

### Before Deploying

- [ ] Create `user_subscriptions` table in Supabase
- [ ] Set all required environment variables in Render
- [ ] Configure webhook URL in DODO Payments dashboard
- [ ] Test webhook with test payments
- [ ] Verify subscription status API works

### After Deploying

- [ ] Test complete payment flow
- [ ] Verify button state changes correctly
- [ ] Check webhook logs for successful processing
- [ ] Test subscription status API endpoint
- [ ] Monitor subscription analytics

## 🔧 Troubleshooting

### Common Issues

**1. Webhook Not Receiving Events**
- Check webhook URL is correct and accessible
- Verify webhook secret key matches environment variable
- Check DODO Payments webhook configuration

**2. Subscription Status Not Updating**
- Verify database table was created correctly
- Check webhook processing logs
- Ensure user_id is correctly passed in payment metadata

**3. Button State Not Changing**
- Check browser console for API errors
- Verify subscription status API returns correct data
- Ensure frontend loads subscription status on login

### Debug Logs

Enable debug logging by checking server logs:

```bash
# Check Render logs for webhook processing
# Look for: "🔔 DODO Payments webhook received"

# Check subscription status loading
# Look for: "📊 Getting subscription status for user"
```

## 📈 Next Steps

### Potential Enhancements

1. **Subscription Tiers** - Add different premium levels
2. **Usage Limits** - Track and enforce premium feature limits
3. **Billing History** - Show user's payment history
4. **Auto-renewal** - Handle recurring subscriptions
5. **Cancellation Flow** - Allow users to cancel subscriptions

### Monitoring

Set up monitoring for:
- Webhook processing success rates
- Subscription conversion rates
- Payment failure rates
- User engagement with premium features

---

## ✅ **Setup Complete!**

Your subscription system is now ready to:
- Track user subscription status
- Handle DODO Payments webhooks
- Update UI based on subscription status
- Provide subscription analytics

The button will automatically show "👑 Premium" for users with active subscriptions!
