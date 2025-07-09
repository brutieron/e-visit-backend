const stripe = require('../utils/stripe'); // The Stripe instance is now used by all functions here.

/**
 * @desc    Creates a Stripe Checkout Session for buying EV-Coins (Stripe-hosted page).
 * @route   POST /api/payment/create-coin-checkout-session
 * @access  Private
 */
exports.createCoinCheckoutSession = async (req, res) => {
    const { name, unit_amount, coins_to_add } = req.body;
    if (!name || !unit_amount || !coins_to_add) {
        return res.status(400).json({ error: 'Missing payment package information.' });
    }
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{ price_data: { currency: 'eur', product_data: { name }, unit_amount }, quantity: 1 }],
            customer_email: req.user.email,
            metadata: { 
                purchase_type: 'ev_coins', 
                userId: req.user.id, 
                coins_to_add 
            },
            success_url: `${process.env.FRONTEND_URL}/dashboard/billing?payment_status=success`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe Coin Error:', err);
        res.status(500).json({ error: 'Failed to create coin checkout session' });
    }
};

/**
 * @desc    Creates a Stripe Payment Intent for the custom, on-site license checkout.
 * @route   POST /api/payment/create-payment-intent
 * @access  Private
 * @updated - Price changed to €60.00 and includes a 20 E-Token bonus.
 */
exports.createPaymentIntent = async (req, res) => {
    const licenseAmount = 6000; // UPDATED: €60.00 in cents
    const coinsWithLicense = 20;  // NEW: Coin bonus for buying a license

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: licenseAmount,
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            description: 'E-Visit Business License (1 Year) + 20 E-Tokens', // More descriptive
            metadata: {
                purchase_type: 'license',
                userId: req.user.id,
                coins_to_add: coinsWithLicense, // NEW: Pass coin bonus to webhook
            }
        });
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err) {
        console.error('Create Payment Intent Error:', err);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};

/**
 * @desc    Creates a Stripe Payment Intent for the custom, on-site coin checkout.
 * @route   POST /api/payment/create-coin-payment-intent
 * @access  Private
 */
exports.createCoinPaymentIntent = async (req, res) => {
    const { name, unit_amount, coins_to_add } = req.body;
    if (!name || !unit_amount || !coins_to_add) {
        return res.status(400).json({ error: 'Missing payment information.' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: unit_amount, // e.g., 1000 for €10.00
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            description: `Purchase of ${name}`,
            metadata: {
                purchase_type: 'ev_coins', // To distinguish in webhook
                userId: req.user.id,
                coins_to_add: coins_to_add,
            }
        });

        // Send the secret key back to the frontend to render the payment form
        res.send({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error("Stripe Error (createCoinPaymentIntent):", error);
        res.status(500).send({ error: 'Failed to initialize payment.' });
    }
};


// --- The function below is for the older, Stripe-hosted checkout page. ---
// --- It has also been updated for consistency. ---

/**
 * @desc    Creates a Stripe Checkout Session for buying a license (Stripe-hosted page).
 * @route   POST /api/payment/create-checkout-session
 * @access  Private
 * @updated - Price changed to €60.00 and includes a 20 E-Token bonus.
 */
exports.createLicenseCheckoutSession = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'E-Visit Business License (1 Year) + 20 E-Tokens' },
            unit_amount: 6000, // UPDATED: €60.00
          },
          quantity: 1,
      }],
      customer_email: req.user.email,
      metadata: {
        purchase_type: 'license',
        userId: req.user.id,
        coins_to_add: 20, // NEW: Pass coin bonus to webhook
      },
      success_url: `${process.env.FRONTEND_URL}/dashboard/billing?payment_status=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe License Error:', err);
    res.status(500).json({ error: 'Failed to create license checkout session' });
  }
};