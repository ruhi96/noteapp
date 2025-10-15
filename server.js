require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Check required environment variables
console.log('🔍 Checking environment variables...');
console.log('PORT:', PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✓ Set' : '✗ Not set');
console.log('FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? '✓ Set' : '✗ Not set');
console.log('Firebase Auth (Required):');
console.log('  FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? '✓ Set' : '✗ Not set');
console.log('  FIREBASE_AUTH_DOMAIN:', process.env.FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Not set');
console.log('  FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Not set');

// Initialize Firebase Admin
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production: Use environment variable (JSON string)
    console.log('📦 Loading Firebase Admin from FIREBASE_SERVICE_ACCOUNT environment variable...');
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Firebase service account parsed successfully');
        console.log('   Project ID:', serviceAccount.project_id);
    } catch (error) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT:', error.message);
        console.error('⚠️  Make sure the environment variable contains valid JSON');
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT environment variable. Must be valid JSON.');
    }
} else {
    // Development: Try to load from local file
    console.log('📁 FIREBASE_SERVICE_ACCOUNT not found, trying local file...');
    try {
        serviceAccount = require('./firebase-service-account.json');
        console.log('✅ Loaded firebase-service-account.json from local file');
    } catch (error) {
        console.error('❌ Firebase service account not found!');
        console.error('');
        console.error('🔧 TO FIX THIS IN RENDER:');
        console.error('   1. Go to Render Dashboard → Your Service → Environment');
        console.error('   2. Add environment variable:');
        console.error('      Key: FIREBASE_SERVICE_ACCOUNT');
        console.error('      Value: Your Firebase service account JSON (single line)');
        console.error('');
        console.error('🔧 TO FIX THIS LOCALLY:');
        console.error('   1. Download service account JSON from Firebase Console');
        console.error('   2. Save as firebase-service-account.json in project root');
        console.error('   OR');
        console.error('   3. Add FIREBASE_SERVICE_ACCOUNT to your .env file');
        console.error('');
        throw new Error('Firebase Admin SDK initialization failed: No service account credentials found.');
    }
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseStorageEndpoint = process.env.SUPABASE_STORAGE_ENDPOINT;
const dodoPaymentsApiKey = process.env.DODO_PAYMENTS_API_KEY;
const dodoProductId = process.env.DODO_PRODUCT_ID;
const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID;
const dodoWebhookKey = process.env.DODO_WEBHOOK_KEY;

console.log('📦 Supabase Configuration:');
console.log('   URL:', supabaseUrl);
console.log('   Anon Key:', supabaseKey ? '✓ Set' : '❌ Missing');
console.log('   Service Key:', supabaseServiceKey ? '✓ Set' : '❌ Missing');
console.log('   Storage Endpoint:', supabaseStorageEndpoint);
console.log('💳 DODO Payments API Key:', dodoPaymentsApiKey ? '✓ Set' : '❌ Missing');
console.log('💳 DODO Product ID:', dodoProductId ? '✓ Set' : '❌ Missing');
console.log('🔗 DODO Webhook Key:', dodoWebhookKey ? '✓ Set' : '❌ Missing');
console.log('📊 Google Analytics ID:', googleAnalyticsId ? '✓ Set' : '❌ Missing');

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Auth middleware
async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ No authorization header found');
            return res.status(401).json({ error: 'Unauthorized - No token provided' });
        }
        
        const token = authHeader.split('Bearer ')[1];
        console.log('🔐 Verifying Firebase token...');
        
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        };
        
        console.log('✅ Token verified for user:', req.user.email);
        console.log('   UID:', req.user.uid);
        
        next();
    } catch (error) {
        console.error('❌ Auth verification error:', error.message);
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
}

// API Routes

// Get Firebase configuration for frontend
app.get('/api/config/firebase', (req, res) => {
    // Only include essential Firebase Auth configuration
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID
    };
    
    // Validate required fields
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        console.error('❌ Missing required Firebase configuration!');
        console.error('   Required: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID');
        return res.status(500).json({ 
            error: 'Firebase configuration incomplete. Please contact administrator.' 
        });
    }
    
    res.json(firebaseConfig);
});

// Get Supabase configuration for frontend
app.get('/api/config/supabase', (req, res) => {
    const supabaseConfig = {
        url: supabaseUrl,
        anonKey: supabaseKey,
        serviceKey: supabaseServiceKey,
        storageEndpoint: supabaseStorageEndpoint
    };
    
    // Validate required fields
    if (!supabaseConfig.url || !supabaseConfig.anonKey || !supabaseConfig.serviceKey) {
        console.error('❌ Missing required Supabase configuration!');
        console.error('   Required: SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY');
        return res.status(500).json({ 
            error: 'Supabase configuration incomplete. Please contact administrator.' 
        });
    }
    
    res.json(supabaseConfig);
});

// Get DODO Payments configuration for frontend
app.get('/api/config/dodo', (req, res) => {
    const dodoConfig = {
        productId: dodoProductId
    };
    
    // Validate required fields
    if (!dodoConfig.productId) {
        console.error('❌ Missing required DODO Payments configuration!');
        console.error('   Required: DODO_PRODUCT_ID');
        return res.status(500).json({ 
            error: 'DODO Payments configuration incomplete. Please contact administrator.' 
        });
    }
    
    res.json(dodoConfig);
});

// Get Google Analytics configuration for frontend
app.get('/api/config/analytics', (req, res) => {
    const analyticsConfig = {
        trackingId: googleAnalyticsId
    };
    
    // Return config even if tracking ID is not set (for development)
    res.json(analyticsConfig);
});

// Create DODO Payments checkout session
app.post('/api/payments/create-checkout', authenticateUser, async (req, res) => {
    try {
        const { productId } = req.body;
        
        // Use productId from request body, or fall back to environment variable
        const finalProductId = productId || dodoProductId;
        
        if (!finalProductId) {
            return res.status(400).json({ error: 'Product ID is required. Please provide in request body or set DODO_PRODUCT_ID environment variable.' });
        }

        if (!dodoPaymentsApiKey) {
            console.error('❌ DODO Payments API key not configured');
            return res.status(500).json({ error: 'Payment system not configured' });
        }

        console.log('💳 Creating checkout session for user:', req.user.email);
        console.log('   Product ID:', finalProductId);

        // Prepare customer information from Firebase user
        const customer = {
            email: req.user.email,
            name: req.user.displayName || req.user.email.split('@')[0],
            phone_number: req.user.phoneNumber || null
        };

        // Prepare billing address (optional - can be collected from user)
        const billing_address = {
            street: '123 Main St', // Default or collect from user
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
            zipcode: '94102'
        };

        // Prepare checkout session data
        const checkoutData = {
            product_cart: [
                {
                    product_id: finalProductId,
                    quantity: 1
                }
            ],
            customer: customer,
            billing_address: billing_address,
            return_url: 'https://noteapp-moei.onrender.com/payment/success',
            cancel_url: 'https://noteapp-moei.onrender.com/payment/cancel',
            metadata: {
                user_id: req.user.uid,
                user_email: req.user.email,
                source: 'note_app_premium_upgrade',
                timestamp: new Date().toISOString()
            }
        };

        console.log('📤 Sending request to DODO Payments:', JSON.stringify(checkoutData, null, 2));

        // Call DODO Payments API
        const response = await fetch('https://test.dodopayments.com/checkouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dodoPaymentsApiKey}`
            },
            body: JSON.stringify(checkoutData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ DODO Payments API error:', response.status, errorText);
            throw new Error(`DODO Payments API error: ${response.status} - ${errorText}`);
        }

        const session = await response.json();
        
        console.log('✅ Checkout session created successfully');
        console.log('   Session ID:', session.session_id);
        console.log('   Checkout URL:', session.checkout_url);

        // Log the checkout session to database for tracking (optional)
        try {
            const { error: logError } = await supabase
                .from('payment_sessions')
                .insert([{
                    user_id: req.user.uid,
                    user_email: req.user.email,
                    session_id: session.session_id,
                    product_id: finalProductId,
                    checkout_url: session.checkout_url,
                    status: 'created',
                    created_at: new Date().toISOString()
                }]);

            if (logError) {
                console.warn('⚠️ Failed to log payment session:', logError.message);
            }
        } catch (logError) {
            console.warn('⚠️ Failed to log payment session:', logError.message);
        }

        res.json({
            success: true,
            checkout_url: session.checkout_url,
            session_id: session.session_id
        });

    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session: ' + error.message 
        });
    }
});

// DODO Payments Webhook Handler
app.post('/api/payments/webhook', async (req, res) => {
    try {
        console.log('🔔 DODO Payments webhook received');
        console.log('📋 Request headers:', JSON.stringify(req.headers, null, 2));
        
        // Log webhook signature
        const signature = req.headers['dodo-signature'] || req.headers['x-dodo-signature'] || req.headers['x-signature'];
        console.log('✅ Webhook signature received:', signature ? signature.substring(0, 30) + '...' : 'None');
        
        // Verify webhook signature (if webhook key is provided)
        if (dodoWebhookKey && signature) {
            // Extract the signature value after the version prefix (e.g., "v1,actualSignature")
            const signatureParts = signature.split(',');
            const actualSignature = signatureParts.length > 1 ? signatureParts[1] : signature;
            
            if (!actualSignature.includes(dodoWebhookKey.substring(0, 10))) {
                console.warn('⚠️ Webhook signature verification skipped - implement proper HMAC validation');
            }
        }
        
        const webhookData = req.body;
        console.log('📦 Full webhook payload:', JSON.stringify(webhookData, null, 2));
        
        const { type, data } = webhookData;
        
        console.log('🎯 Event type:', type);
        
        if (type === 'payment.succeeded' || type === 'payment.completed' || type === 'checkout.completed') {
            await handlePaymentCompleted(data);
        } else if (type === 'payment.failed' || type === 'checkout.failed') {
            await handlePaymentFailed(data);
        } else if (type === 'payment.cancelled' || type === 'checkout.cancelled') {
            await handlePaymentCancelled(data);
        } else {
            console.log('ℹ️ Unhandled event type:', type);
        }
        
        res.json({ success: true, message: 'Webhook processed successfully' });
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Helper function to handle successful payments
async function handlePaymentCompleted(paymentData) {
    try {
        console.log('✅ Processing completed payment');
        console.log('📊 Payment data:', JSON.stringify(paymentData, null, 2));
        
        const { 
            checkout_session_id, 
            payment_id, 
            subscription_id,
            total_amount, 
            currency, 
            customer, 
            metadata,
            status 
        } = paymentData;
        
        // Get user_id from metadata or lookup from payment_sessions table
        let userId = metadata?.user_id;
        let userEmail = customer?.email || metadata?.user_email;
        
        if (!userId && checkout_session_id) {
            console.log('⚠️ No user_id in metadata, looking up in payment_sessions table...');
            console.log('🔍 Looking up session_id:', checkout_session_id);
            
            const { data: sessionData, error: sessionError } = await supabaseService
                .from('payment_sessions')
                .select('user_id, user_email')
                .eq('session_id', checkout_session_id)
                .single();
            
            if (sessionError) {
                console.error('❌ Failed to lookup payment session:', sessionError);
                console.error('❌ Error details:', JSON.stringify(sessionError, null, 2));
            } else if (sessionData) {
                userId = sessionData.user_id;
                userEmail = userEmail || sessionData.user_email;
                console.log('✅ Found user_id from payment_sessions:', userId);
            }
        }
        
        if (!userId) {
            console.error('❌ Could not determine user_id from metadata or payment_sessions table');
            console.error('❌ Payment data:', JSON.stringify(paymentData, null, 2));
            return;
        }
        
        console.log('👤 Processing payment for user_id:', userId);
        
        console.log('👤 Updating subscription for user:', userId);
        console.log('🔑 Subscription ID:', subscription_id);
        
        // Check if subscription_id already exists
        if (subscription_id) {
            console.log('🔍 Checking if subscription_id exists:', subscription_id);
            
            const { data: existingSubscription, error: checkError } = await supabaseService
                .from('user_subscriptions')
                .select('*')
                .eq('subscription_id', subscription_id)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('❌ Error checking existing subscription:', checkError);
                console.error('❌ Check error details:', JSON.stringify(checkError, null, 2));
            } else if (checkError && checkError.code === 'PGRST116') {
                console.log('✅ No existing subscription found (expected for new subscriptions)');
            } else {
                console.log('✅ Existing subscription found:', JSON.stringify(existingSubscription, null, 2));
            }
            
            if (existingSubscription) {
                console.log('✅ Subscription already exists, updating status to active');
                
                // Update existing subscription to active
                const { error: updateError } = await supabaseService
                    .from('user_subscriptions')
                    .update({
                        subscription_status: 'premium',
                        is_active: true,
                        payment_id: payment_id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('subscription_id', subscription_id);
                
                if (updateError) {
                    console.error('❌ Failed to update existing subscription:', updateError);
                } else {
                    console.log('✅ Existing subscription updated to active');
                }
                return;
            }
        }
        
        // Create new subscription record
        console.log('📝 Creating new subscription record');
        
        const subscriptionRecord = {
            user_id: userId,
            user_email: userEmail,
            subscription_status: 'premium',
            subscription_type: 'premium',
            product_id: metadata.product || metadata.product_id || dodoProductId,
            session_id: checkout_session_id,
            payment_id: payment_id,
            subscription_id: subscription_id,
            amount: total_amount ? (total_amount / 100) : null, // Convert from cents
            currency: currency || 'USD',
            subscription_start_date: new Date().toISOString(),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📊 Subscription record to insert:', JSON.stringify(subscriptionRecord, null, 2));
        
        const { data: insertData, error: insertError } = await supabaseService
            .from('user_subscriptions')
            .insert([subscriptionRecord])
            .select();
        
        if (insertError) {
            console.error('❌ Failed to create subscription:', insertError);
            console.error('❌ Error details:', JSON.stringify(insertError, null, 2));
        } else {
            console.log('✅ New subscription created successfully');
            console.log('📊 Inserted data:', JSON.stringify(insertData, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Error handling payment completion:', error);
    }
}

// Helper function to handle failed payments
async function handlePaymentFailed(paymentData) {
    try {
        console.log('❌ Processing failed payment:', paymentData);
        
        const { checkout_session_id, subscription_id, metadata } = paymentData;
        
        // Get user_id from metadata or lookup from payment_sessions table
        let userId = metadata?.user_id;
        
        if (!userId && checkout_session_id) {
            console.log('⚠️ No user_id in metadata, looking up in payment_sessions table...');
            const { data: sessionData } = await supabaseService
                .from('payment_sessions')
                .select('user_id')
                .eq('session_id', checkout_session_id)
                .single();
            
            if (sessionData) {
                userId = sessionData.user_id;
                console.log('✅ Found user_id from payment_sessions:', userId);
            }
        }
        
        if (userId) {
            
            // Try to update by subscription_id first, then by session_id
            if (subscription_id) {
                const { error: updateError } = await supabaseService
                    .from('user_subscriptions')
                    .update({
                        subscription_status: 'failed',
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('subscription_id', subscription_id);
                
                if (updateError) {
                    console.error('❌ Failed to update subscription status:', updateError);
                } else {
                    console.log('✅ Subscription status updated to failed for subscription:', subscription_id);
                }
            } else if (checkout_session_id) {
                const { error: updateError } = await supabaseService
                    .from('user_subscriptions')
                    .update({
                        subscription_status: 'failed',
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('session_id', checkout_session_id);
                
                if (updateError) {
                    console.error('❌ Failed to update subscription status:', updateError);
                } else {
                    console.log('✅ Subscription status updated to failed for session:', checkout_session_id);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error handling payment failure:', error);
    }
}

// Helper function to handle cancelled payments
async function handlePaymentCancelled(paymentData) {
    try {
        console.log('🚫 Processing cancelled payment:', paymentData);
        
        const { checkout_session_id, subscription_id, metadata } = paymentData;
        
        // Get user_id from metadata or lookup from payment_sessions table
        let userId = metadata?.user_id;
        
        if (!userId && checkout_session_id) {
            console.log('⚠️ No user_id in metadata, looking up in payment_sessions table...');
            const { data: sessionData } = await supabaseService
                .from('payment_sessions')
                .select('user_id')
                .eq('session_id', checkout_session_id)
                .single();
            
            if (sessionData) {
                userId = sessionData.user_id;
                console.log('✅ Found user_id from payment_sessions:', userId);
            }
        }
        
        if (userId) {
            
            // Try to update by subscription_id first, then by session_id
            if (subscription_id) {
                const { error: updateError } = await supabaseService
                    .from('user_subscriptions')
                    .update({
                        subscription_status: 'cancelled',
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('subscription_id', subscription_id);
                
                if (updateError) {
                    console.error('❌ Failed to update subscription status:', updateError);
                } else {
                    console.log('✅ Subscription status updated to cancelled for subscription:', subscription_id);
                }
            } else if (checkout_session_id) {
                const { error: updateError } = await supabaseService
                    .from('user_subscriptions')
                    .update({
                        subscription_status: 'cancelled',
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('session_id', checkout_session_id);
                
                if (updateError) {
                    console.error('❌ Failed to update subscription status:', updateError);
                } else {
                    console.log('✅ Subscription status updated to cancelled for session:', checkout_session_id);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error handling payment cancellation:', error);
    }
}

// Get user subscription status
app.get('/api/user/subscription-status', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userEmail = req.user.email;
        
        console.log('📊 Getting subscription status for user:', userId);
        console.log('   Email:', userEmail);
        
        // Get user's current subscription status (use service key for reliability)
        const { data: subscription, error } = await supabaseService
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('❌ Error fetching subscription status:', error);
            console.error('   Error code:', error.code);
            console.error('   Error details:', JSON.stringify(error, null, 2));
            return res.status(500).json({ error: 'Failed to fetch subscription status' });
        }
        
        if (error && error.code === 'PGRST116') {
            console.log('ℹ️ No active subscription found for user:', userId);
        } else if (subscription) {
            console.log('✅ Subscription found:');
            console.log('   Status:', subscription.subscription_status);
            console.log('   Is Active:', subscription.is_active);
            console.log('   Subscription ID:', subscription.subscription_id);
        }
        
        const isPremium = subscription && subscription.subscription_status === 'premium' && subscription.is_active;
        
        console.log('📊 Result: isPremium =', isPremium);
        
        res.json({
            isPremium: isPremium,
            subscription: subscription || null,
            status: isPremium ? 'premium' : 'free'
        });
        
    } catch (error) {
        console.error('❌ Error getting subscription status:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

// Handle payment success callback
app.get('/payment/success', async (req, res) => {
    try {
        const { session_id, payment_status } = req.query;
        
        console.log('✅ Payment success callback received');
        console.log('   Session ID:', session_id);
        console.log('   Payment Status:', payment_status);

        // Update payment session status in database
        if (session_id) {
            try {
                const { error } = await supabase
                    .from('payment_sessions')
                    .update({ 
                        status: payment_status || 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('session_id', session_id);

                if (error) {
                    console.warn('⚠️ Failed to update payment session:', error.message);
                }
            } catch (updateError) {
                console.warn('⚠️ Failed to update payment session:', updateError.message);
            }
        }

        // Redirect to app with success message
        res.redirect('https://noteapp-moei.onrender.com?payment=success');
        
    } catch (error) {
        console.error('❌ Error handling payment success:', error);
        res.redirect('https://noteapp-moei.onrender.com?payment=error');
    }
});

// Handle payment cancellation
app.get('/payment/cancel', async (req, res) => {
    try {
        const { session_id } = req.query;
        
        console.log('❌ Payment cancelled');
        console.log('   Session ID:', session_id);

        // Update payment session status in database
        if (session_id) {
            try {
                const { error } = await supabase
                    .from('payment_sessions')
                    .update({ 
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('session_id', session_id);

                if (error) {
                    console.warn('⚠️ Failed to update payment session:', error.message);
                }
            } catch (updateError) {
                console.warn('⚠️ Failed to update payment session:', updateError.message);
            }
        }

        // Redirect to app with cancellation message
        res.redirect('https://noteapp-moei.onrender.com?payment=cancelled');
        
    } catch (error) {
        console.error('❌ Error handling payment cancellation:', error);
        res.redirect('https://noteapp-moei.onrender.com?payment=error');
    }
});

// Get all notes for authenticated user
app.get('/api/notes', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', req.user.uid)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Upload file to Supabase Storage (mapped to note)
app.post('/api/upload', authenticateUser, async (req, res) => {
    try {
        const { fileName, fileData, fileType, noteId } = req.body;
        
        if (!fileName || !fileData) {
            return res.status(400).json({ error: 'File name and data are required' });
        }
        
        // Convert base64 to buffer
        const base64Data = fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique file path mapped to note
        // Format: userId/noteId/timestamp-filename (if noteId provided)
        // Format: userId/temp/timestamp-filename (if no noteId yet)
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const folder = noteId || 'temp';
        const filePath = `${req.user.uid}/${folder}/${timestamp}-${sanitizedFileName}`;
        
        console.log('📤 Uploading file to Supabase Storage:');
        console.log('   Endpoint:', supabaseStorageEndpoint);
        console.log('   Path:', filePath);
        console.log('   Size:', buffer.length, 'bytes');
        
        // Upload to Supabase Storage at the specific endpoint
        const { data, error } = await supabase.storage
            .from('Note app')
            .upload(filePath, buffer, {
                contentType: fileType,
                upsert: false
            });
        
        if (error) {
            console.error('❌ Supabase storage error:', error);
            throw error;
        }
        
        // Get public URL using the storage endpoint
        const { data: { publicUrl } } = supabase.storage
            .from('Note app')
            .getPublicUrl(filePath);
        
        console.log('✅ File uploaded successfully');
        console.log('   Storage path:', filePath);
        console.log('   Public URL:', publicUrl);
        
        res.json({
            success: true,
            url: publicUrl,
            path: filePath,
            name: fileName,
            size: buffer.length,
            type: fileType,
            storageEndpoint: supabaseStorageEndpoint
        });
        
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file: ' + error.message });
    }
});

// Create a new note for authenticated user
app.post('/api/notes', authenticateUser, async (req, res) => {
    try {
        const { title, content, attachments } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const noteData = { 
            title, 
            content, 
            user_id: req.user.uid,
            user_email: req.user.email,
            attachments: attachments || []
        };
        
        console.log('📝 Creating note for user:', req.user.email);
        console.log('   User ID:', req.user.uid);
        console.log('   Attachments:', attachments?.length || 0);
        
        const { data, error } = await supabase
            .from('notes')
            .insert([noteData])
            .select()
            .single();
        
        if (error) {
            console.error('❌ Supabase insert error:', error);
            throw error;
        }
        
        console.log('✅ Note created successfully with ID:', data.id);
        console.log('   Stored user_id:', data.user_id);
        console.log('   Stored user_email:', data.user_email);
        
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note: ' + error.message });
    }
});

// Update note attachments
app.patch('/api/notes/:id', authenticateUser, async (req, res) => {
    try {
        const noteId = req.params.id;
        const { attachments } = req.body;
        
        console.log('📝 Updating note ID:', noteId, 'with', attachments?.length || 0, 'attachments');
        
        const { data, error } = await supabase
            .from('notes')
            .update({ attachments })
            .eq('id', noteId)
            .eq('user_id', req.user.uid)  // Ensure user owns the note
            .select()
            .single();
        
        if (error) {
            console.error('❌ Supabase update error:', error);
            throw error;
        }
        
        console.log('✅ Note updated with attachments');
        
        res.json(data);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note: ' + error.message });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Note app is ready!`);
});

