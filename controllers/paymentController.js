// controllers/paymentController.js

const stripe = require('../utils/stripe');
const User = require('../models/User');
const License = require('../models/License'); // This is needed for the cancel function

// --- Subscription Plan Configuration ---
const subscriptionPlans = {
    'price_1Rml8NHIxC4T13ajfNl5fHAx': { name: 'Monthly Plan', coins_to_add: 5, plan_type: 'monthly' },
    'price_1RmlCmHIxC4T13ajEjaMtYrT': { name: '6-Month Plan', coins_to_add: 10, plan_type: 'six-month' },
    'price_1RmlE8HIxC4T13ajIZEBfrqM': { name: 'Yearly Plan', coins_to_add: 25, plan_type: 'yearly' },
};


/**
 * @desc    Creates a Stripe Subscription for the selected E-Visiton Pro plan.
 * @route   POST /api/payment/create-subscription
 * @access  Private
 */
exports.createSubscription = async (req, res) => {
    const { priceId } = req.body;
    const user = req.user;

    if (!priceId || !subscriptionPlans[priceId]) {
        return res.status(400).json({ error: 'Invalid subscription plan selected.' });
    }

    const planDetails = subscriptionPlans[priceId];

    try {
        let stripeCustomerId = user.stripe_customer_id;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId: user.id },
            });
            stripeCustomerId = customer.id;
            await User.updateStripeCustomerId(user.id, stripeCustomerId);
        }

        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                userId: user.id,
                purchase_type: 'subscription',
                plan_type: planDetails.plan_type,
                coins_to_add: planDetails.coins_to_add,
            }
        });

        res.send({
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            subscriptionId: subscription.id,
        });

    } catch (err) {
        console.error('Stripe Subscription Error:', err);
        res.status(500).json({ error: 'Failed to create subscription.' });
    }
};


// --- COIN PURCHASE CONTROLLERS (Unchanged) ---
exports.createCoinCheckoutSession = async (req, res) => {
    const { name, unit_amount, coins_to_add } = req.body;
    if (!name || !unit_amount || !coins_to_add) return res.status(400).json({ error: 'Missing payment package information.' });
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{ price_data: { currency: 'eur', product_data: { name }, unit_amount }, quantity: 1 }],
            customer_email: req.user.email,
            metadata: { purchase_type: 'ev_coins', userId: req.user.id, coins_to_add },
            success_url: `${process.env.FRONTEND_URL}/dashboard/billing?payment_status=success`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe Coin Error:', err);
        res.status(500).json({ error: 'Failed to create coin checkout session' });
    }
};

exports.createCoinPaymentIntent = async (req, res) => {
    const { name, unit_amount, coins_to_add } = req.body;
    if (!name || !unit_amount || !coins_to_add) return res.status(400).json({ error: 'Missing payment information.' });
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: unit_amount,
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            description: `Purchase of ${name}`,
            metadata: { purchase_type: 'ev_coins', userId: req.user.id, coins_to_add: coins_to_add, }
        });
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("Stripe Error (createCoinPaymentIntent):", error);
        res.status(500).send({ error: 'Failed to initialize payment.' });
    }
};


// --- NEW: SUBSCRIPTION MANAGEMENT CONTROLLERS ---

/**
 * @desc    Creates a Stripe Customer Portal session for the user to manage their billing.
 * @route   POST /api/payment/create-portal-session
 * @access  Private
 */
exports.createPortalSession = async (req, res) => {
    try {


        const user = req.user;
        if (!user.stripe_customer_id) {
            return res.status(400).json({ error: 'User is not a Stripe customer.' });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${process.env.FRONTEND_URL}/dashboard/purchases`,
        });

        res.json({ url: portalSession.url });
    } catch (err) {
        console.error('Stripe Portal Error:', err);
        res.status(500).json({ error: 'Failed to create customer portal session.' });
    }
};

/**
 * @desc    Cancels the user's active subscription at the end of the period.
 * @route   POST /api/payment/cancel-subscription
 * @access  Private
 */
exports.cancelSubscription = async (req, res) => {
    try {
        const license = await License.findByUserId(req.user.id);
        if (!license || !license.stripe_subscription_id) {
            return res.status(404).json({ error: 'No active subscription found to cancel.' });
        }

        await stripe.subscriptions.update(license.stripe_subscription_id, {
            cancel_at_period_end: true,
        });

        await License.updateOne(
            { stripe_subscription_id: license.stripe_subscription_id },
            { subscription_status: 'canceled' }
        );

        res.json({ message: 'Subscription successfully scheduled for cancellation.' });
    } catch (err) {
        console.error('Cancel Subscription Error:', err);
        res.status(500).json({ error: 'Failed to cancel subscription.' });
    }
};