// utils/pdfGenerator.js - CORRECTED REQUIRE STATEMENTS

const Invoice = require('../models/invoiceModel');
// THIS IS THE FIX: Properly requiring the node modules
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');

// --- Helper Functions ---
const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const companyConfig = {
    logo_url: 'https://api.e-visiton.com/e-visiton.png',
    name: 'E-Visiton.',
    address: 'Kaçanik, Kosovo',
    email: 'support@e-visiton.com',
};

// --- INVOICE PDF GENERATOR ---
const generateInvoicePDF = async (invoiceId) => {
    console.log(`[PDF INVOICE] Starting generation for ID: ${invoiceId}`);
    
    // STEP 1: Fetch Invoice from Database
    let invoice;
    try {
        invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new Error(`Invoice not found in the database for ID: ${invoiceId}`);
        }
        console.log(`[PDF INVOICE] Successfully fetched invoice #${invoice.invoice_number}`);
    } catch (dbError) {
        console.error('[PDF INVOICE] FATAL: Database error while fetching invoice.', dbError);
        throw new Error('A database error occurred while fetching the invoice.');
    }

    // STEP 2: Read HTML Template from disk
    const templatePath = path.join(__dirname, '..', 'templates', 'invoiceTemplate.html');
    let htmlContent;
    try {
        htmlContent = await fs.readFile(templatePath, 'utf-8');
        console.log(`[PDF INVOICE] Successfully read HTML template.`);
    } catch (templateError) {
        console.error(`[PDF INVOICE] FATAL: Could not read HTML template file at ${templatePath}`, templateError);
        throw new Error('Server configuration error: The invoice HTML template is missing.');
    }

    // STEP 3: Populate HTML with Invoice Data
    const lineItemsHtml = invoice.lineItems.map(item => `
        <tr>
            <td class="description">${item.description || ''}</td>
            <td class="align-right">${item.quantity || 0}</td>
            <td class="align-right">${formatCurrency(item.unit_price)}</td>
            <td class="align-right">${formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</td>
        </tr>
    `).join('');

    htmlContent = htmlContent
        .replace(/{{recipient_name}}/g, invoice.recipient_name || 'N/A')
        .replace(/{{recipient_email}}/g, invoice.recipient_email || 'N/A')
        .replace(/{{invoice_number}}/g, invoice.invoice_number || 'N/A')
        .replace(/{{issue_date}}/g, formatDate(invoice.issue_date))
        .replace(/{{due_date}}/g, formatDate(invoice.due_date))
        .replace(/{{status}}/g, invoice.status || 'draft')
        .replace(/{{lineItems}}/g, lineItemsHtml)
        .replace(/{{subtotal}}/g, formatCurrency(invoice.subtotal))
        .replace(/{{tax}}/g, formatCurrency(invoice.tax))
        .replace(/{{totalAmount}}/g, formatCurrency(invoice.total_amount))
        .replace(/{{notes}}/g, invoice.notes || '')
        .replace(/{{logo_url}}/g, companyConfig.logo_url)
        .replace(/{{company_name}}/g, companyConfig.name)
        .replace(/{{company_address}}/g, companyConfig.address)
        .replace(/{{company_email}}/g, companyConfig.email)
        .replace(/{{currentYear}}/g, new Date().getFullYear());
    
    // STEP 4: Generate the PDF using Puppeteer
    let browser;
    try {
        console.log('[PDF INVOICE] Launching Puppeteer browser...');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        
        const page = await browser.newPage();
        
        console.log('[PDF INVOICE] Setting page content...');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        console.log('[PDF INVOICE] Generating PDF buffer from HTML...');
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Puppeteer generated an empty or invalid PDF buffer. The HTML content may be broken or a resource (like an image) might not be loading.');
        }

        console.log(`[PDF INVOICE] SUCCESS: PDF generated. Buffer size: ${pdfBuffer.length} bytes.`);
        
        return { pdfBuffer, invoice };
    } catch (puppeteerError) {
        console.error('[PDF INVOICE] FATAL: A critical error occurred during the Puppeteer PDF generation process.', puppeteerError.stack);
        throw new Error('The PDF generation service failed internally.');
    } finally {
        if (browser) {
            console.log('[PDF INVOICE] Closing Puppeteer browser.');
            await browser.close();
        }
    }
};

// We are only exporting the invoice function for now to stay focused.
// The offer generator can be added back later.
module.exports = { generateInvoicePDF };