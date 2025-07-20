// controllers/webhookController.js

const stripe = require('../utils/stripe');
const User = require('../models/User');
const License = require('../models/License');
const { generateReceipt } = require('./receiptController');
const { sendReceiptEmail, sendRenewalFailedEmail } = require('../utils/nodemailer');

// --- HELPER 1: FULFILL ONE-TIME COIN PURCHASE (Unchanged) ---
const fulfillCoinPurchase = async (userId, coinsToAdd) => {
    if (!userId || isNaN(coinsToAdd) || coinsToAdd <= 0) {
        throw new Error(`Invalid data for coin fulfillment: userId=${userId}, coinsToAdd=${coinsToAdd}`);
    }
    await User.addCoins(userId, coinsToAdd);
    console.log(`[Fulfillment] Added ${coinsToAdd} E-Tokens to user ID: ${userId}.`);
};

// --- HELPER 2: FULFILL INITIAL SUBSCRIPTION & LICENSE ---
const fulfillInitialSubscription = async (eventObject) => {
    let metadata, stripeCustomerId, stripeSubscriptionId, userId, sessionOrInvoiceId, paymentIntentId, currentPeriodEnd;

    // This logic correctly gets the subscription object to access its properties
    if (eventObject.object === 'checkout.session' || eventObject.object === 'invoice') {
        const subscription = await stripe.subscriptions.retrieve(eventObject.subscription);
        metadata = subscription.metadata; // Always get metadata from the authoritative Subscription object
        stripeCustomerId = subscription.customer;
        stripeSubscriptionId = subscription.id;
        userId = metadata.userId;
        sessionOrInvoiceId = eventObject.id;
        currentPeriodEnd = new Date(subscription.current_period_end * 1000); // Get the date
        
        if (eventObject.object === 'invoice') {
            paymentIntentId = eventObject.payment_intent;
        } else {
            paymentIntentId = eventObject.payment_intent;
        }
    } else {
        throw new Error("fulfillInitialSubscription called with unknown object type.");
    }

    if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
        throw new Error(`[CRITICAL] Missing crucial data for initial subscription fulfillment.`);
    }

    const user = await User.findById(userId);
    if (!user) throw new Error(`User ID ${userId} not found.`);

    const existingLicense = await License.findOne({ stripeSubscriptionId });
    if (existingLicense) {
        console.log(`[Info] License for subscription ${stripeSubscriptionId} already exists. Skipping.`);
        return;
    }
    
    /**
     * <<<<<<<<<<<<<<<<<<<<<<<< THE ONLY CHANGE IS HERE >>>>>>>>>>>>>>>>>>>>
     * The create call now includes `current_period_end`, which fixes the date display.
     */
    await License.create({
        userId,
        stripeSubscriptionId,
        stripeSessionId: sessionOrInvoiceId,
        subscriptionStatus: 'active',
        plan_type: metadata.plan_type,
        current_period_end: currentPeriodEnd, // This is the fix
    });
    console.log(`[Fulfillment] Initial License created for User ID: ${userId}.`);
    
    const coinsToAdd = parseInt(metadata.coins_to_add || 0, 10);
    if (coinsToAdd > 0) {
        await fulfillCoinPurchase(userId, coinsToAdd);
    }
    
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const { receiptRecord, pdfBuffer } = await generateReceipt(paymentIntent, user);
        await sendReceiptEmail(user, receiptRecord, pdfBuffer);
        console.log(`✅✅✅ Successfully sent receipt for initial purchase to user ${user.email}.`);
    } catch (emailError) {
        console.error(`❌ [Warning] Fulfillment succeeded but failed to send receipt email for user ${userId}:`, emailError);
    }
};

// --- HELPER 3: HANDLE SUBSCRIPTION RENEWAL ---
const handleSubscriptionRenewal = async (invoice) => {
    const stripeSubscriptionId = invoice.subscription;
    const newPeriodEnd = new Date(invoice.period_end * 1000);

    const license = await License.findOne({ stripeSubscriptionId });
    if (!license) throw new Error(`[CRITICAL] Received renewal for unknown subscription: ${stripeSubscriptionId}`);

    await License.updateOne({ stripeSubscriptionId }, { 
        subscription_status: 'active',
        current_period_end: newPeriodEnd
    });
    console.log(`[Fulfillment] Subscription renewed for User ID: ${license.userId}.`);

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
        const user = await User.findById(license.userId);
        const { receiptRecord, pdfBuffer } = await generateReceipt(paymentIntent, user, invoice);
        await sendReceiptEmail(user, receiptRecord, pdfBuffer);
        console.log(`✅✅✅ Successfully sent renewal receipt to ${user.email}.`);
    } catch (receiptError) {
        console.error(`❌ [Warning] Renewal succeeded but failed to send receipt email for Sub ID ${stripeSubscriptionId}:`, receiptError);
    }
};

// --- HELPER 4: HANDLE SUBSCRIPTION CANCELLATION ---
const handleSubscriptionCancellation = async (subscription) => {
    const license = await License.findOne({ stripeSubscriptionId: subscription.id });
    if (!license) { console.warn(`[Warning] Received cancellation for unknown subscription: ${subscription.id}`); return; }
    await License.updateOne({ stripeSubscriptionId: subscription.id }, { subscription_status: 'canceled' });
    console.log(`[Fulfillment] Subscription for User ID: ${license.userId} marked as 'canceled'.`);
};

// --- THE FINAL, UNIFIED WEBHOOK HANDLER ---
exports.handleStripeEvents = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('❌ Stripe signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`✅ Stripe Webhook Received: ${event.type}`);
    
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                if (paymentIntent.metadata.purchase_type === 'ev_coins') {
                    const user = await User.findById(paymentIntent.metadata.userId);
                    if (!user) throw new Error(`User not found for payment_intent ${paymentIntent.id}`);
                    await fulfillCoinPurchase(user.id, parseInt(paymentIntent.metadata.coins_to_add, 10));
                    const { receiptRecord, pdfBuffer } = await generateReceipt(paymentIntent, user);
                    await sendReceiptEmail(user, receiptRecord, pdfBuffer);
                }
                break;
            case 'checkout.session.completed':
                const session = event.data.object;
                if (session.mode === 'subscription') { await fulfillInitialSubscription(session); }
                break;
            case 'invoice.paid':
                const invoice = event.data.object;
                if (invoice.billing_reason === 'subscription_create') { await fulfillInitialSubscription(invoice); } 
                else if (invoice.billing_reason === 'subscription_cycle') { await handleSubscriptionRenewal(invoice); }
                break;
            case 'invoice.payment_failed':
                const failedInvoice = event.data.object;
                const user = await User.findOne({ stripe_customer_id: failedInvoice.customer });
                if (user) {
                    await License.updateOne({ stripeSubscriptionId: failedInvoice.subscription }, { subscription_status: 'past_due' });
                    console.log(`[Warning] Payment failed for user ${user.email}. Status set to 'past_due'.`);
                }
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionCancellation(event.data.object);
                break;
            default:
                console.log(`[Info] Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(`❌ Webhook handler error for event [${event.id}] | Type [${event.type}]:`, error.message);
        return res.status(500).json({ error: 'Internal server error during webhook processing.' });
    }

    res.json({ received: true });
};