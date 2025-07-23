// controllers/offerController.js - FINAL VERSION

const Offer = require('../models/offerModel');
const { sendOfferEmail } = require('../utils/nodemailer');
const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');

// =================================================================
//          INTERNAL PDF GENERATION MASTER FUNCTION FOR OFFERS
// =================================================================
async function generatePdfForOffer(offerId) {
    let browser;
    try {
        console.log(`[PDF Master - Offer] Starting generation for offer ID: ${offerId}`);
        const offer = await Offer.findById(offerId);
        if (!offer) {
            throw new Error(`Offer with ID ${offerId} not found.`);
        }
        console.log(`[PDF Master - Offer] Fetched offer #${offer.offer_number}`);

        const templatePath = path.join(__dirname, '..', 'templates', 'offerTemplate.html');
        const htmlTemplate = await fs.readFile(templatePath, 'utf-8');
        console.log(`[PDF Master - Offer] Read HTML template.`);

        const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
        const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const lineItemsHtml = offer.lineItems.map(item => `
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
        
        const statusText = offer.status ? offer.status.charAt(0).toUpperCase() + offer.status.slice(1) : 'Draft';

        const htmlContent = htmlTemplate
            .replace(/{{logo_url}}/g, companyConfig.logo_url)
            .replace(/{{company_name}}/g, companyConfig.name)
            .replace(/{{company_address}}/g, companyConfig.address)
            .replace(/{{company_email}}/g, companyConfig.email)
            .replace(/{{recipient_name}}/g, offer.recipient_name || 'N/A')
            .replace(/{{recipient_email}}/g, offer.recipient_email || 'N/A')
            .replace(/{{offer_number}}/g, offer.offer_number || 'N/A')
            .replace(/{{issue_date}}/g, formatDate(offer.issue_date))
            .replace(/{{valid_until}}/g, formatDate(offer.valid_until))
            .replace(/{{status}}/g, statusText)
            .replace(/{{lineItems}}/g, lineItemsHtml)
            .replace(/{{subtotal}}/g, formatCurrency(offer.subtotal))
            .replace(/{{tax}}/g, formatCurrency(offer.tax))
            .replace(/{{totalAmount}}/g, formatCurrency(offer.total_amount))
            .replace(/{{notes}}/g, offer.notes || '')
            .replace(/{{currentYear}}/g, new Date().getFullYear());
        
        console.log('[PDF Master - Offer] Launching Puppeteer...');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Puppeteer generated an empty PDF buffer for the offer.');
        }
        console.log(`[PDF Master - Offer] PDF generation successful. Size: ${pdfBuffer.length} bytes.`);
        
        return { pdfBuffer, offer };

    } catch (error) {
        console.error('[PDF Master - Offer] A fatal error occurred during PDF generation:', error.stack);
        throw error;
    } finally {
        if (browser) {
            console.log('[PDF Master - Offer] Closing Puppeteer browser.');
            await browser.close();
        }
    }
}

// =================================================================
//                  PUBLIC CONTROLLER FUNCTIONS FOR OFFERS
// =================================================================

exports.sendOfferByEmail = async (req, res) => {
    try {
        const { pdfBuffer, offer } = await generatePdfForOffer(req.params.id);

        if (offer.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft offers can be sent.' });
        }
        
        await sendOfferEmail(offer, pdfBuffer);
        
        await Offer.updateStatus(offer.id, 'sent');
        const updatedOffer = await Offer.findById(req.params.id);
        
        res.status(200).json({ message: 'Offer sent successfully!', offer: updatedOffer });

    } catch (error) {
        console.error('CRITICAL ERROR in sendOfferByEmail route:', error.message);
        res.status(500).json({ message: `Failed to send offer: ${error.message}` });
    }
};

exports.downloadOfferPDF = async (req, res) => {
    try {
        const { pdfBuffer, offer } = await generatePdfForOffer(req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=offer-${offer.offer_number}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('CRITICAL ERROR in downloadOfferPDF route:', error.message);
        res.status(500).json({ message: `Failed to download PDF: ${error.message}` });
    }
};

exports.createOffer = async (req, res) => {
    try {
        const { recipientName, recipientEmail, lineItems, validUntil } = req.body;
        if (!recipientName || !recipientEmail || !lineItems || !lineItems.length || !validUntil) {
            return res.status(400).json({ message: 'Recipient details, valid until date, and at least one line item are required.' });
        }
        const offerData = { ...req.body, createdBy: req.user.id };
        const createdOffer = await Offer.create(offerData);
        res.status(201).json(createdOffer);
    } catch (error) {
        console.error('Error in createOffer controller:', error);
        // --- IMPROVEMENT ---
        // This now includes the specific database error message in the response,
        // making it clear that the 'offer' sequence is missing.
        res.status(500).json({ 
            message: 'Server error while creating offer.',
            error: error.message // Pass the specific error message to the client
        });
    }
};

exports.updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offerExists = await Offer.findById(id);
        if (!offerExists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const updatedOffer = await Offer.update(id, req.body);
        res.status(200).json(updatedOffer);
    } catch (error) {
        console.error('Error in updateOffer controller:', error);
        res.status(500).json({ message: 'Server error while updating offer.', error: error.message });
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
        const { id } = req.params;
        const offerExists = await Offer.findById(id);
        if (!offerExists) return res.status(404).json({ message: 'Offer not found' });
        
        await Offer.delete(id);
        res.status(200).json({ message: 'Offer deleted successfully.' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ message: 'Server error while deleting offer.' });
    }
};