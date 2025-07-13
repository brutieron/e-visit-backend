// controllers/invoiceController.js - FINAL CORRECTION FOR {{Status}}

const Invoice = require('../models/invoiceModel');
const { sendInvoiceEmail } = require('../utils/nodemailer');
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');

async function generatePdfForInvoice(invoiceId) {
    let browser;
    try {
        console.log(`[PDF Master] Starting generation for invoice ID: ${invoiceId}`);
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new Error(`Invoice with ID ${invoiceId} not found.`);
        }
        console.log(`[PDF Master] Fetched invoice #${invoice.invoice_number}`);

        const templatePath = path.join(__dirname, '..', 'templates', 'invoiceTemplate.html');
        const htmlTemplate = await fs.readFile(templatePath, 'utf-8');
        console.log(`[PDF Master] Read HTML template.`);

        const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
        const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const lineItemsHtml = invoice.lineItems.map(item => `
            <tr>
                <td class="description">${item.description || ''}</td>
                <td class="align-right">${item.quantity || 0}</td>
                <td class="align-right">${formatCurrency(item.unit_price)}</td>
                <td class="align-right">${formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</td>
            </tr>
        `).join('');

        const companyConfig = {
            logo_url: 'https://api.e-visiton.com/e-visiton.png',
            name: 'E-Visiton.',
            address: 'Kaçanik, Kosovo',
            email: 'support@e-visiton.com',
        };

        // --- THE FIX IS HERE ---
        const statusText = invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Draft';

        const htmlContent = htmlTemplate
            .replace(/{{logo_url}}/g, companyConfig.logo_url)
            .replace(/{{company_name}}/g, companyConfig.name)
            .replace(/{{company_address}}/g, companyConfig.address)
            .replace(/{{company_email}}/g, companyConfig.email)
            .replace(/{{recipient_name}}/g, invoice.recipient_name || 'N/A')
            .replace(/{{recipient_email}}/g, invoice.recipient_email || 'N/A')
            .replace(/{{invoice_number}}/g, invoice.invoice_number || 'N/A')
            .replace(/{{issue_date}}/g, formatDate(invoice.issue_date))
            .replace(/{{due_date}}/g, formatDate(invoice.due_date))
            // This now correctly uses {{Status}} with a capital 'S'
            .replace(/{{Status}}/g, statusText) 
            .replace(/{{lineItems}}/g, lineItemsHtml)
            .replace(/{{subtotal}}/g, formatCurrency(invoice.subtotal))
            .replace(/{{tax}}/g, formatCurrency(invoice.tax))
            .replace(/{{totalAmount}}/g, formatCurrency(invoice.total_amount))
            .replace(/{{notes}}/g, invoice.notes || '')
            .replace(/{{currentYear}}/g, new Date().getFullYear());
        
        console.log('[PDF Master] Launching Puppeteer...');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Puppeteer generated an empty PDF buffer.');
        }
        console.log(`[PDF Master] PDF generation successful. Size: ${pdfBuffer.length} bytes.`);
        
        return { pdfBuffer, invoice };

    } catch (error) {
        console.error('[PDF Master] A fatal error occurred during PDF generation:', error.stack);
        throw error;
    } finally {
        if (browser) {
            console.log('[PDF Master] Closing Puppeteer browser.');
            await browser.close();
        }
    }
}

// --- Public controller functions ---
// (These are unchanged but are included for completeness)

exports.sendInvoiceByEmail = async (req, res) => {
    try {
        const { pdfBuffer, invoice } = await generatePdfForInvoice(req.params.id);
        if (invoice.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft invoices can be sent.' });
        }
        await sendInvoiceEmail(invoice, pdfBuffer);
        await Invoice.updateStatus(invoice.id, 'sent');
        const updatedInvoice = await Invoice.findById(req.params.id);
        res.status(200).json({ message: 'Invoice sent successfully!', invoice: updatedInvoice });
    } catch (error) {
        console.error('CRITICAL ERROR in sendInvoiceByEmail route:', error.message);
        res.status(500).json({ message: `Failed to send invoice: ${error.message}` });
    }
};

exports.downloadInvoicePDF = async (req, res) => {
    try {
        const { pdfBuffer, invoice } = await generatePdfForInvoice(req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('CRITICAL ERROR in downloadInvoicePDF route:', error.message);
        res.status(500).json({ message: `Failed to download PDF: ${error.message}` });
    }
};

exports.createInvoice = async (req, res) => {
    try {
        const { recipientName, recipientEmail, lineItems, dueDate } = req.body;
        if (!recipientName || !recipientEmail || !lineItems || !lineItems.length || !dueDate) {
            return res.status(400).json({ message: 'Recipient details, due date, and at least one line item are required.' });
        }
        const invoiceData = { ...req.body, createdBy: req.user.id };
        const createdInvoice = await Invoice.create(invoiceData);
        res.status(201).json(createdInvoice);
    } catch (error) {
        console.error('Error in createInvoice controller:', error);
        res.status(500).json({ message: 'Server error while creating invoice.' });
    }
};

exports.updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceExists = await Invoice.findById(id);
        if (!invoiceExists) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        const updatedInvoice = await Invoice.update(id, req.body);
        res.status(200).json(updatedInvoice);
    } catch (error) {
        console.error('Error in updateInvoice controller:', error);
        res.status(500).json({ message: 'Server error while updating invoice.' });
    }
};

exports.getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll();
        res.json(invoices);
    } catch (error) {
        console.error('Error getting all invoices:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getInvoiceById = async (req, res) => {
     try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.json(invoice);
    } catch (error) {
        console.error(`Error getting invoice by ID ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceExists = await Invoice.findById(id);
        if (!invoiceExists) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        await Invoice.delete(id);
        res.status(200).json({ message: 'Invoice deleted successfully.' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ message: 'Server error while deleting invoice.' });
    }
};