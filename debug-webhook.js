// Debug webhook endpoint locally
// Run with: node debug-webhook.js

const testPayload = {
    type: 'payment.succeeded',
    business_id: 'bus_JlagSLJBK8pKdy8DUI0jY',
    timestamp: '2025-10-09T19:04:09.525987Z',
    data: {
        subscription_id: 'sub_65BdAyLSsVOQL0xXXrUdF',
        payment_id: 'pay_y8Kv1LHb5If80PkXn7dmH',
        checkout_session_id: 'cks_URuC2d4xNonSIKk3n8k6m',
        total_amount: 10905,
        currency: 'INR',
        status: 'succeeded',
        customer: {
            email: 'dsk003@gmail.com',
            name: 'Deepak Krishnan'
        },
        metadata: {
            user_id: 'ksNz0ZmkelTiqHar66BsOcmMTGI2',
            user_email: 'dsk003@gmail.com',
            product: 'premium_upgrade'
        }
    }
};

async function debugWebhook() {
    console.log('🔍 Debugging webhook endpoint...\n');
    
    try {
        // Test 1: Check if server is running
        console.log('1️⃣ Testing server connectivity...');
        const healthResponse = await fetch('http://localhost:3001/');
        console.log('✅ Server is running');
        
        // Test 2: Send webhook payload
        console.log('\n2️⃣ Sending webhook payload...');
        console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
        
        const response = await fetch('http://localhost:3001/api/payments/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'dodo-signature': 'v1,x/OU/I2XIU25xuGTO...'
            },
            body: JSON.stringify(testPayload)
        });

        console.log('📊 Response status:', response.status);
        
        const responseText = await response.text();
        console.log('📄 Response body:', responseText);
        
        if (response.ok) {
            console.log('\n✅ Webhook processed successfully!');
            console.log('\n🔍 Check server logs for database operations');
            console.log('📊 Expected logs:');
            console.log('   - "✅ Processing completed payment"');
            console.log('   - "👤 Updating subscription for user: ksNz0ZmkelTiqHar66BsOcmMTGI2"');
            console.log('   - "🔑 Subscription ID: sub_65BdAyLSsVOQL0xXXrUdF"');
            console.log('   - "📝 Creating new subscription record" OR "✅ Subscription already exists"');
        } else {
            console.log('\n❌ Webhook processing failed');
            console.log('Status:', response.status);
            console.log('Response:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Server is not running. Start it with:');
            console.log('   node server.js');
        }
    }
}

// Run debug
debugWebhook();
