// webhookController.js

const stripe = require('../utils/stripe');
const User = require('../models/User');
const License = require('../models/License');

// --- Import our new, specialized controllers ---
const { generateReceipt } = require('./receiptController');
const { sendReceiptEmail } = require('../utils/nodemailer');

// --- HELPER 1: Fulfill Coin Purchase (no changes needed) ---
const fulfillCoinPurchase = async (userId, coinsToAdd) => {
    if (!userId || isNaN(coinsToAdd) || coinsToAdd <= 0) {
        throw new Error(`Invalid data for coin fulfillment: userId=${userId}, coinsToAdd=${coinsToAdd}`);
    }
    await User.addCoins(userId, coinsToAdd);
    console.log(`[Fulfillment] Added ${coinsToAdd} E-Tokens to user ID: ${userId}.`);
};

// --- HELPER 2: Fulfill License Purchase (no changes needed) ---
const fulfillLicensePurchase = async (userId, coinsToAdd, stripeSessionId = null) => {
    if (!userId) {
        throw new Error("Webhook received a license purchase event without a valid userId.");
    }
    await License.create({ userId, stripeSessionId });
    console.log(`[Fulfillment] License activated for user ID: ${userId}`);
    if (coinsToAdd > 0) {
        await fulfillCoinPurchase(userId, coinsToAdd);
    }
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

    // We only care about successful payment events.
    if (event.type !== 'checkout.session.completed' && event.type !== 'payment_intent.succeeded') {
        console.log(`✅ Stripe Webhook Event Received (and ignored): ${event.type}`);
        return res.json({ received: true });
    }

    console.log(`✅ Stripe Webhook Success Event Received: ${event.type}`);

    // Get the core data objects we'll need for orchestration.
    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata;
    const stripeId = paymentIntent.id;

    try {
        // --- STEP 1: Fetch the User ---
        // We need the full user object for names, emails, etc.
        const user = await User.findById(metadata.userId);
        if (!user) {
            throw new Error(`User with ID ${metadata.userId} not found in database. Cannot fulfill purchase.`);
        }
        
        // --- STEP 2: Fulfill the Order (Update the Database) ---
        // This MUST happen first.
        const coinsToAdd = parseInt(metadata.coins_to_add || 0, 10);
        if (metadata.purchase_type === 'license') {
            await fulfillLicensePurchase(user.id, coinsToAdd, stripeId);
        } else if (metadata.purchase_type === 'ev_coins') {
            await fulfillCoinPurchase(user.id, coinsToAdd);
        } else {
            console.warn(`Webhook received successful payment with unhandled purchase_type: '${metadata.purchase_type}'`);
            // We'll still try to send a generic receipt if possible.
        }

        // --- STEP 3: Generate the Receipt Record and PDF ---
        // This returns an object: { receiptRecord, pdfBuffer }
        const { receiptRecord, pdfBuffer } = await generateReceipt(paymentIntent, user);

        // --- STEP 4: Send the Email with the PDF Attachment ---
        await sendReceiptEmail(user, receiptRecord, pdfBuffer);

        console.log(`✅✅✅ Successfully completed full cycle for user ${user.email} and receipt ${receiptRecord.receipt_number}.`);

    } catch (error) {
        console.error(`❌ Webhook Orchestration Error for Stripe ID [${stripeId}]:`, error.message);
        // Return a 500 error so Stripe knows to retry the webhook later. This is crucial.
        return res.status(500).json({ error: 'Internal server error during purchase fulfillment or receipt generation.' });
    }
    
    // Acknowledge receipt of the event to Stripe with a 200 OK
    res.json({ received: true });
};