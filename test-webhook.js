// Test script to simulate DODO Payments webhook locally
// Run with: node test-webhook.js

const webhookPayload = {
  business_id: 'bus_JlagSLJBK8pKdy8DUI0jY',
  data: {
    billing: {
      city: 'bengalore',
      country: 'IN',
      state: 'Karnataka',
      street: 'HM Gladiolus, Ulsoor, Bangalore,  39 Aga Abbas Ali Road, Halasuru',
      zipcode: '560042'
    },
    brand_id: 'bus_JlagSLJBK8pKdy8DUI0jY',
    business_id: 'bus_JlagSLJBK8pKdy8DUI0jY',
    card_issuing_country: 'GB',
    card_last_four: '4242',
    card_network: 'VISA',
    card_type: 'CREDIT',
    checkout_session_id: 'cks_URuC2d4xNonSIKk3n8k6m',
    created_at: '2025-10-09T19:03:48.529044Z',
    currency: 'INR',
    customer: {
      customer_id: 'cus_mAqmgCePuElaZwl3kEDNu',
      email: 'dsk003@gmail.com',
      name: 'Deepak Krishnan',
      phone_number: null
    },
    digital_products_delivered: false,
    discount_id: null,
    disputes: [],
    error_code: null,
    error_message: null,
    metadata: {
      product: 'premium_upgrade',
      user_email: 'dsk003@gmail.com',
      user_id: 'ksNz0ZmkelTiqHar66BsOcmMTGI2'
    },
    payload_type: 'Payment',
    payment_id: 'pay_y8Kv1LHb5If80PkXn7dmH',
    payment_link: 'https://test.checkout.dodopayments.com/1KmF6iM5',
    payment_method: 'card',
    payment_method_type: null,
    product_cart: null,
    refunds: [],
    settlement_amount: 118,
    settlement_currency: 'USD',
    settlement_tax: 18,
    status: 'succeeded',
    subscription_id: 'sub_65BdAyLSsVOQL0xXXrUdF',
    tax: 1664,
    total_amount: 10905,
    updated_at: null
  },
  timestamp: '2025-10-09T19:04:09.525987Z',
  type: 'payment.succeeded'
};

async function testWebhook() {
    console.log('🧪 Testing webhook locally...\n');
    
    try {
        const response = await fetch('http://localhost:3001/api/payments/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'dodo-signature': 'v1,x/OU/I2XIU25xuGTO...'
            },
            body: JSON.stringify(webhookPayload)
        });

        const result = await response.json();
        
        console.log('✅ Response status:', response.status);
        console.log('📦 Response body:', JSON.stringify(result, null, 2));
        
        if (response.ok) {
            console.log('\n✅ Webhook processed successfully!');
            console.log('\nNext steps:');
            console.log('1. Check your Supabase database');
            console.log('2. Run verify-subscription.sql to see the data');
            console.log('3. Expected subscription_id: sub_65BdAyLSsVOQL0xXXrUdF');
        } else {
            console.log('\n❌ Webhook processing failed');
        }
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
        console.log('\n⚠️ Make sure your server is running on http://localhost:3001');
        console.log('   Run: node server.js');
    }
}

// Run test
testWebhook();

