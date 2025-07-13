// controllers/receiptController.js - IMPROVED VERSION

const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const Receipt = require('../models/receiptModel');

const formatCurrency = (amountInCents) => (amountInCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

/**
 * Generates a receipt record and its corresponding PDF buffer.
 * It does NOT send the email.
 * @param {object} paymentIntent - The full PaymentIntent object from Stripe.
 * @param {object} user - The user object from your database.
 * @returns {Promise<{receiptRecord: object, pdfBuffer: Buffer}>}
 */
exports.generateReceipt = async (paymentIntent, user) => {
    let browser;
    try {
        console.log(`[Receipt Service] Starting receipt generation for user ID: ${user.id}`);

        // 1. Determine Item Description
        let itemDescription;
        if (paymentIntent.metadata.purchase_type === 'license') {
            itemDescription = 'E-Visit Pro License (1 Year) + 20 E-Token Bonus';
        } else if (paymentIntent.metadata.purchase_type === 'ev_coins') {
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
        console.log(`[Receipt Service] DB record created: ${receiptRecord.receipt_number}`);

        // 3. Populate HTML
        const templatePath = path.join(__dirname, '..', 'templates', 'receiptTemplate.html');
        let htmlTemplate = await fs.readFile(templatePath, 'utf-8');
        
        const htmlContent = htmlTemplate
            .replace(/{{company_name}}/g, 'E-Visiton.')
            .replace(/{{company_address}}/g, 'Kaçanik, Kosovo')
            .replace(/{{company_email}}/g, 'support@e-visiton.com')
            .replace(/{{logo_url}}/g, `${process.env.BACKEND_URL}/e-visiton.png`)
            .replace(/{{receipt_number}}/g, receiptRecord.receipt_number)
            .replace(/{{issue_date}}/g, new Date(receiptRecord.issue_date).toLocaleDateString('en-GB'))
            .replace(/{{customer_name}}/g, `${user.name} ${user.surname}`)
            .replace(/{{customer_email}}/g, user.email)
            .replace(/{{line_items}}/g, `<tr><td>${itemDescription}</td><td class="align-right">1</td><td class="align-right">${formatCurrency(paymentIntent.amount)}</td><td class="align-right">${formatCurrency(paymentIntent.amount)}</td></tr>`)
            .replace(/{{subtotal}}/g, formatCurrency(paymentIntent.amount))
            .replace(/{{tax_amount}}/g, formatCurrency(0))
            .replace(/{{total}}/g, formatCurrency(paymentIntent.amount))
            .replace(/{{payment_method}}/g, 'Card')
            .replace(/{{transaction_id}}/g, paymentIntent.id);

        // 4. Generate PDF
        console.log('[Receipt Service] Launching Puppeteer to generate PDF...');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("Puppeteer generated an empty receipt PDF.");
        }
        console.log(`[Receipt Service] PDF generated successfully. Size: ${pdfBuffer.length}`);

        return { receiptRecord, pdfBuffer };
    } catch (error) {
        console.error("[Receipt Service] A fatal error occurred during receipt generation:", error.stack);
        // It's important to re-throw the error so the calling function knows something went wrong.
        throw error;
    } finally {
        if (browser) {
            console.log('[Receipt Service] Closing Puppeteer browser.');
            await browser.close();
        }
    }
};