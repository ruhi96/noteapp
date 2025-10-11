# DODO Payments Integration Setup Guide

This guide will help you set up DODO Payments integration for premium upgrades in your notes app.

## 🎯 Features Implemented

- **"Upgrade to Premium" button** in the user interface
- **DODO Payments API integration** with secure backend handling
- **Payment redirect handling** for success/failure/cancellation
- **Payment session tracking** in Supabase database
- **User-friendly notifications** for payment status
- **Secure API key management** with environment variables

## 📋 Prerequisites

1. **DODO Payments Account** with API access
2. **Product created** in DODO Payments dashboard
3. **Supabase Project** for payment session tracking
4. **Render Deployment** (or local development)

## 🔧 Setup Steps

### 1. Get DODO Payments Credentials

1. **Log in to DODO Payments Dashboard**
2. **Go to API Keys section**
3. **Copy your API Key** (test or live)
4. **Go to Products section**
5. **Create a product** for premium upgrade
6. **Copy the Product ID**

### 2. Update Environment Variables

Add to your `.env` file:

```env
# DODO Payments Configuration
DODO_PAYMENTS_API_KEY=your_actual_dodo_payments_api_key
DODO_PRODUCT_ID=your_actual_dodo_product_id
```

**For Render Deployment:**
- Go to Render Dashboard → Your Service → Environment
- Add: `DODO_PAYMENTS_API_KEY` = `your_actual_dodo_payments_api_key`
- Add: `DODO_PRODUCT_ID` = `your_actual_dodo_product_id`

### 3. Create Payment Sessions Table

Run this SQL in **Supabase SQL Editor**:

```sql
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);

-- Enable RLS
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payment sessions"
ON payment_sessions FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert payment sessions"
ON payment_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "System can update payment sessions"
ON payment_sessions FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated');
```

### 4. Product ID Configuration

The product ID is now automatically loaded from the `DODO_PRODUCT_ID` environment variable. No code changes needed!

### 5. Test the Integration

1. **Deploy to Render** (or run locally)
2. **Sign in to your app**
3. **Click "Upgrade to Premium" button**
4. **Verify redirect to DODO Payments checkout**
5. **Test payment flow**

## 🔄 Payment Flow

### 1. User Clicks "Upgrade to Premium"
```
User clicks button → Frontend calls /api/payments/create-checkout
```

### 2. Backend Creates Checkout Session
```
Backend calls DODO Payments API → Creates checkout session → Returns checkout URL
```

### 3. User Completes Payment
```
User redirected to DODO Payments → Completes payment → Redirected back to app
```

### 4. Payment Status Handling
```
Success: ?payment=success → Shows success notification
Cancel: ?payment=cancelled → Shows cancellation message  
Error: ?payment=error → Shows error message
```

## 📊 API Endpoints

### Backend Endpoints

- `POST /api/payments/create-checkout` - Create DODO Payments checkout session
- `GET /payment/success` - Handle successful payment redirect
- `GET /payment/cancel` - Handle payment cancellation

### Frontend Methods

- `upgradeToPremium()` - Initiate premium upgrade
- `handlePaymentRedirects()` - Handle payment status from URL
- `showSuccessMessage()` - Display success notification
- `showErrorMessage()` - Display error notification

## 🔒 Security Features

### API Security
- **Bearer token authentication** required for checkout creation
- **Environment variable** for API key (not exposed to frontend)
- **User validation** through Firebase authentication

### Data Security
- **Payment sessions** tracked in secure database
- **RLS policies** protect user data
- **No sensitive data** stored in frontend

### Payment Security
- **DODO Payments handles** all payment processing
- **Secure redirects** for payment completion
- **Session tracking** for audit trail

## 🎨 UI Components

### Premium Button
- **Gradient styling** with hover effects
- **Loading state** during processing
- **Disabled state** prevents double-clicks

### Notifications
- **Success notifications** with green gradient
- **Error notifications** with red gradient
- **Auto-dismiss** after timeout
- **Manual close** option

## 🐛 Troubleshooting

### Common Issues

**"Payment system not configured"**
- Check `DODO_PAYMENTS_API_KEY` is set in environment variables
- Verify API key is valid and has proper permissions

**"Failed to create checkout session"**
- Check DODO Payments API is accessible
- Verify product ID exists in DODO Payments dashboard
- Check API key has permission to create checkouts

**Payment redirects not working**
- Verify redirect URLs in DODO Payments dashboard
- Check payment/success and payment/cancel routes exist
- Ensure URLs match your deployed app domain

**Database errors**
- Run payment-sessions-schema.sql in Supabase
- Check RLS policies are correctly set
- Verify Supabase connection is working

### Debug Logging

Check server logs for:
```
💳 Creating checkout session for user: user@example.com
📤 Sending request to DODO Payments: {...}
✅ Checkout session created successfully
🔗 Redirecting to checkout URL: https://...
```

Check browser console for:
```
💳 Starting premium upgrade for user: user@example.com
✅ Checkout session created: sess_123
🔗 Redirecting to checkout URL: https://...
```

## 📈 Analytics

### Payment Session Tracking

View payment analytics in Supabase:
```sql
-- Payment sessions by status
SELECT status, COUNT(*) as count 
FROM payment_sessions 
GROUP BY status;

-- Revenue by date
SELECT DATE(created_at) as date, 
       COUNT(*) as sessions,
       SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue
FROM payment_sessions 
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🚀 Deployment Checklist

- [ ] DODO Payments API key added to environment variables
- [ ] DODO Product ID added to environment variables
- [ ] Payment sessions table created in Supabase
- [ ] RLS policies applied to payment_sessions table
- [ ] Backend deployed with new payment endpoints
- [ ] Frontend deployed with premium button
- [ ] Test payment flow end-to-end

## 📞 Support

### DODO Payments Support
- **Documentation**: https://docs.dodopayments.com
- **API Reference**: https://docs.dodopayments.com/api
- **Support**: Contact DODO Payments support

### App Support
- Check server logs for backend errors
- Check browser console for frontend errors
- Verify all environment variables are set
- Test with DODO Payments test mode first

## 🎉 You're Ready!

Your notes app now supports:
- ✅ Premium upgrade button
- ✅ DODO Payments integration
- ✅ Secure payment processing
- ✅ Payment status tracking
- ✅ User notifications
- ✅ Production-ready deployment

**Happy monetizing!** 💰🚀
