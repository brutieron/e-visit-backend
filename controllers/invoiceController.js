const Invoice = require('../models/invoiceModel');
const { sendInvoiceEmail } = require('../utils/nodemailer');
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');

// Helper function to prepare HTML and generate a PDF using the new template
const generateInvoicePDF = async (invoiceId) => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const templatePath = path.join(__dirname, '..', 'templates', 'invoiceTemplate.html');
    let htmlContent = await fs.readFile(templatePath, 'utf-8');

    // --- Configuration for static data ---
    const companyConfig = {
        logo_url: 'http://localhost:5000/e-visiton.png', // Your backend URL
        name: 'E-Visiton.',
        address: 'Kaçanik, Kosovo',
        email: 'support@e-visiton.com',
    };

    // --- Helper functions ---
    const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // --- Generate Line Items HTML with new CSS classes ---
    const lineItemsHtml = invoice.lineItems.map(item => `
        <tr>
            <td class="description">${item.description}</td>
            <td class="align-right">${item.quantity}</td>
            <td class="align-right">${formatCurrency(item.unit_price)}</td>
            <td class="align-right">${formatCurrency(item.quantity * item.unit_price)}</td>
        </tr>
    `).join('');

    // --- Replace all placeholders in the new template ---
    htmlContent = htmlContent
        .replace(/{{logo_url}}/g, companyConfig.logo_url)
        .replace(/{{company_name}}/g, companyConfig.name)
        .replace(/{{company_address}}/g, companyConfig.address)
        .replace(/{{company_email}}/g, companyConfig.email)
        .replace(/{{recipient_name}}/g, invoice.recipient_name)
        .replace(/{{recipient_email}}/g, invoice.recipient_email)
        .replace(/{{invoice_number}}/g, invoice.invoice_number)
        .replace(/{{issue_date}}/g, formatDate(invoice.issue_date))
        .replace(/{{due_date}}/g, formatDate(invoice.due_date))
        .replace(/{{status}}/g, invoice.status || 'draft')
        .replace(/{{lineItems}}/g, lineItemsHtml)
        .replace(/{{subtotal}}/g, formatCurrency(invoice.subtotal))
        .replace(/{{tax}}/g, formatCurrency(invoice.tax))
        .replace(/{{totalAmount}}/g, formatCurrency(invoice.total_amount))
        .replace(/{{currentYear}}/g, new Date().getFullYear());

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    
    return { pdfBuffer, invoice };
};

// --- API Functions (No changes needed here) ---

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
        const invoiceExists = await Invoice.findById(req.params.id);
        if (!invoiceExists) return res.status(404).json({ message: 'Invoice not found' });
        const updatedInvoice = await Invoice.update(req.params.id, req.body);
        res.status(200).json(updatedInvoice);
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ message: 'Server error while updating invoice.' });
    }
};

exports.sendInvoiceByEmail = async (req, res) => {
    try {
        const { pdfBuffer, invoice } = await generateInvoicePDF(req.params.id);
        if (invoice.status !== 'draft') return res.status(400).json({ message: 'Only draft invoices can be sent.' });
        
        await sendInvoiceEmail(invoice, pdfBuffer);
        await Invoice.updateStatus(invoice.id, 'sent');
        
        res.status(200).json({ message: 'Invoice sent successfully!' });
    } catch (error) {
        console.error('Error sending invoice email:', error);
        res.status(500).json({ message: 'Server error while sending invoice.' });
    }
};

exports.downloadInvoicePDF = async (req, res) => {
    try {
        const { pdfBuffer, invoice } = await generateInvoicePDF(req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error downloading invoice PDF:', error);
        res.status(500).json({ message: 'Server error while generating PDF.' });
    }
};

exports.getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll();
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getInvoiceById = async (req, res) => {
     try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteInvoice = async (req, res) => {
    try {
        const invoiceExists = await Invoice.findById(req.params.id);
        if (!invoiceExists) return res.status(404).json({ message: 'Invoice not found' });
        
        await Invoice.delete(req.params.id);
        res.status(200).json({ message: 'Invoice deleted successfully.' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ message: 'Server error while deleting invoice.' });
    }
};