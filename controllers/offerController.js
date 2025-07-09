const Offer = require('../models/offerModel');
const { sendOfferEmail } = require('../utils/nodemailer');
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');

// Helper function to prepare HTML and generate a PDF using the new template
const generateOfferPDF = async (offerId) => {
    const offer = await Offer.findById(offerId);
    if (!offer) throw new Error('Offer not found');

    const templatePath = path.join(__dirname, '..', 'templates', 'offerTemplate.html');
    let htmlContent = await fs.readFile(templatePath, 'utf-8');

    // --- Configuration for static data ---
    const companyConfig = {
        logo_url: 'http://localhost:5000/e-visiton.png', // Your backend URL
        name: 'E-Visiton.',
        address: 'Kaçanik, Kosovo',
        email: 'support@e-visiton.com', // Sales email for offers
    };

    // --- Helper functions ---
    const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // --- Generate Line Items HTML with new CSS classes ---
    const lineItemsHtml = offer.lineItems.map(item => `
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
        .replace(/{{recipient_name}}/g, offer.recipient_name)
        .replace(/{{recipient_email}}/g, offer.recipient_email)
        .replace(/{{offer_number}}/g, offer.offer_number)
        .replace(/{{issue_date}}/g, formatDate(offer.issue_date))
        .replace(/{{valid_until}}/g, formatDate(offer.valid_until))
        .replace(/{{status}}/g, offer.status || 'draft')
        .replace(/{{lineItems}}/g, lineItemsHtml)
        .replace(/{{subtotal}}/g, formatCurrency(offer.subtotal))
        .replace(/{{tax}}/g, formatCurrency(offer.tax))
        .replace(/{{totalAmount}}/g, formatCurrency(offer.total_amount))
        .replace(/{{currentYear}}/g, new Date().getFullYear());

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    
    return { pdfBuffer, offer };
};

// NOTE: This is the existing code from your offerController, no changes needed below this line
exports.createOffer = async (req, res) => {
    try {
        const { recipientName, recipientEmail, lineItems, validUntil } = req.body;
        if (!recipientName || !recipientEmail || !lineItems || !lineItems.length || !validUntil) {
            return res.status(400).json({ message: 'Recipient details, valid date, and at least one line item are required.' });
        }
        const offerData = { ...req.body, createdBy: req.user.id };
        const createdOffer = await Offer.create(offerData);
        res.status(201).json(createdOffer);
    } catch (error) {
        console.error('Error in createOffer controller:', error);
        res.status(500).json({ message: 'Server error while creating offer.' });
    }
};

exports.updateOffer = async (req, res) => {
    try {
        const offerExists = await Offer.findById(req.params.id);
        if (!offerExists) return res.status(404).json({ message: 'Offer not found' });
        const updatedOffer = await Offer.update(req.params.id, req.body);
        res.status(200).json(updatedOffer);
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ message: 'Server error while updating offer.' });
    }
};

exports.sendOfferByEmail = async (req, res) => {
    try {
        const { pdfBuffer, offer } = await generateOfferPDF(req.params.id);
        if (offer.status !== 'draft') return res.status(400).json({ message: 'Only draft offers can be sent.' });
        
        await sendOfferEmail(offer, pdfBuffer); 
        await Offer.updateStatus(offer.id, 'sent');
        
        res.status(200).json({ message: 'Offer sent successfully!' });
    } catch (error) {
        console.error('Error sending offer email:', error);
        res.status(500).json({ message: 'Server error while sending offer.' });
    }
};

exports.downloadOfferPDF = async (req, res) => {
    try {
        const { pdfBuffer, offer } = await generateOfferPDF(req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=offer-${offer.offer_number}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error downloading offer PDF:', error);
        res.status(500).json({ message: 'Server error while generating PDF.' });
    }
};

exports.getAllOffers = async (req, res) => {
    try {
        const offers = await Offer.findAll();
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getOfferById = async (req, res) => {
     try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ message: 'Offer not found' });
        res.json(offer);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteOffer = async (req, res) => {
    try {
        const offerExists = await Offer.findById(req.params.id);
        if (!offerExists) return res.status(404).json({ message: 'Offer not found' });

        await Offer.delete(req.params.id);
        res.status(200).json({ message: `Offer deleted successfully.` });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ message: 'Server error while deleting offer.' });
    }
};