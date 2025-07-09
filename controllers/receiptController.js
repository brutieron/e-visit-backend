// controllers/receiptController.js

const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const Receipt = require('../models/receiptModel');

const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

/**
 * Generates a receipt record and its corresponding PDF buffer.
 * It does NOT send the email. It returns the necessary components for another service to use.
 * @param {object} paymentIntent - The full PaymentIntent object from Stripe.
 * @param {object} user - The user object from your database.
 * @returns {Promise<{receiptRecord: object, pdfBuffer: Buffer}>} An object containing the new receipt record and the PDF buffer.
 */
exports.generateReceipt = async (paymentIntent, user) => {
    console.log(`[Receipt] Starting receipt generation for user ID: ${user.id}`);

    // 1. Determine Item Description
    const purchaseType = paymentIntent.metadata.purchase_type;
    let itemDescription;
    if (purchaseType === 'license') {
        itemDescription = 'E-Visit Pro License (1 Year) + 20 E-Token Bonus';
    } else if (purchaseType === 'ev_coins') {
        itemDescription = `${paymentIntent.metadata.coins_to_add} E-Tokens Package`;
    } else {
        itemDescription = 'E-Visit Purchase';
    }

    // 2. Create DB Record
    const receiptRecord = await Receipt.create({
        userId: user.id,
        stripePaymentIntentId: paymentIntent.id,
        itemDescription: itemDescription,
        amount: paymentIntent.amount,
    });
    console.log(`[Receipt] DB record created: ${receiptRecord.receipt_number}`);

    // 3. Prepare Template Data
    const templateData = {
        company_name: 'E-Visiton.',
        company_address: 'Kaçanik, Kosovo',
        company_email: 'support@e-visit.com',
        logo_url: `${process.env.BACKEND_URL}/e-visiton.png`,
        receipt_number: receiptRecord.receipt_number,
        issue_date: new Date(receiptRecord.issue_date).toLocaleDateString('en-GB'),
        customer_name: `${user.name} ${user.surname}`,
        customer_email: user.email,
        line_items: `<tr><td>${itemDescription}</td><td class="align-right">1</td><td class="align-right">${formatCurrency(paymentIntent.amount)}</td><td class="align-right">${formatCurrency(paymentIntent.amount)}</td></tr>`,
        subtotal: formatCurrency(paymentIntent.amount),
        tax_amount: formatCurrency(0),
        total: formatCurrency(paymentIntent.amount),
        payment_method: 'Card',
        transaction_id: paymentIntent.id,
    };

    // 4. Populate HTML
    const templatePath = path.join(__dirname, '..', 'templates', 'receiptTemplate.html');
    let htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    for (const [key, value] of Object.entries(templateData)) {
        htmlTemplate = htmlTemplate.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // 5. Generate PDF
    console.log('[Receipt] Launching Puppeteer to generate PDF...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    console.log('[Receipt] PDF generated successfully.');

    // 6. Return the components
    return { receiptRecord, pdfBuffer };
};