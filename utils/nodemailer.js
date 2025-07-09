// utils/nodemailer.js

const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

// Transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD }
});

// --- Master Branded Email Template ---
const createBrandedEmail = (content, options = {}) => {
    const brandColor = "#EA850C";
    const accentColor = "#2A5CAA";
    const year = new Date().getFullYear();
    const logoUrl = 'https://yourdomain.com/e-visit-logo.png'; // Update with your production domain
    const { preheader = '', cta = null } = options;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-Visit Communication</title>
        <style>
            body { font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; background-color: #F8FAFC; color: #333333; line-height: 1.6; }
            .email-container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; }
            .header { padding: 30px 20px; text-align: center; background-color: ${brandColor}; }
            .logo { height: 40px; }
            .content { padding: 30px 40px; }
            .footer { padding: 20px; text-align: center; background-color: #F1F5F9; font-size: 12px; color: #64748B; }
            .divider { height: 1px; background-color: #E2E8F0; margin: 20px 0; }
            h1, h2, h3 { color: ${brandColor}; margin-top: 0; }
            h2 { font-size: 22px; margin-bottom: 20px; }
            p { margin-bottom: 16px; font-size: 15px; }
            a { color: ${accentColor}; text-decoration: none; }
            .button-container { text-align: center; margin: 25px 0; }
            .button { display: inline-block; background-color: ${accentColor}; color: #FFFFFF !important; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 15px; }
            .code-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; margin: 25px 0; text-align: center; border-radius: 4px; }
            .code { font-size: 28px; font-weight: 700; letter-spacing: 5px; color: ${brandColor}; font-family: monospace; }
            .quote { border-left: 3px solid ${accentColor}; padding-left: 15px; margin-left: 0; color: #555555; font-style: italic; }
            @media only screen and (max-width: 600px) { .content { padding: 20px; } h2 { font-size: 20px; } }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
            <div class="header"><img src="${logoUrl}" alt="E-Visit Logo" class="logo" /></div>
            <div class="content">
                ${content}
                ${cta ? `<div class="button-container"><a href="${cta.url}" class="button">${cta.text}</a></div>` : ''}
            </div>
            <div class="footer">
                <p>© ${year} E-Visit. All rights reserved.</p>
                <p>Prishtina, Kosovo | <a href="https://yourdomain.com">Visit Website</a></p>
                <p style="margin-top: 10px;">
                    <a href="https://facebook.com/evisit" style="margin: 0 5px;">Facebook</a> | 
                    <a href="https://instagram.com/evisit" style="margin: 0 5px;">Instagram</a> | 
                    <a href="https://linkedin.com/company/evisit" style="margin: 0 5px;">LinkedIn</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// --- FIX: Corrected helper function to populate the HTML template ---
// It now takes htmlContent as an argument and returns the modified version.
const populateHtmlTemplate = (htmlContent, businessData) => {
    let populatedContent = htmlContent;

    const citySlug = (businessData.city_slug || 'city').replace(/^\//, '');
    const slug = businessData.slug || 'your-business';
    const qrCodeUrl = `https://yourdomain.com/${citySlug}/${slug}`;

    // Replace all placeholders with data or defaults
    populatedContent = populatedContent.replace(/{{title}}/g, businessData.title || 'Your Business');
    populatedContent = populatedContent.replace(/{{city}}/g, businessData.city_name || 'Your City');
    populatedContent = populatedContent.replace(/{{email}}/g, businessData.contact_email || 'contact@example.com');
    populatedContent = populatedContent.replace(/{{phone}}/g, businessData.contact_whatsapp || '+000 00 000 000');
    populatedContent = populatedContent.replace(/{{category}}/g, businessData.category || 'Business Category');
    populatedContent = populatedContent.replace(/{{address}}/g, businessData.address || 'Business Address');
    populatedContent = populatedContent.replace(/{{website}}/g, businessData.website || 'https://example.com');
    populatedContent = populatedContent.replace(/{{slug}}/g, slug);
    populatedContent = populatedContent.replace(/{{city_slug}}/g, citySlug);
    populatedContent = populatedContent.replace(/{{qr_code_url}}/g, qrCodeUrl);
    
    return populatedContent;
};

// --- Image Generation Helper (PNG) ---
const generateVisitCardImage = async (businessData) => {
    let browser;
    try {
        const templatePath = path.join(__dirname, '..', 'templates', 'businessVisitCardTemplate.html');
        let htmlContent = await fs.readFile(templatePath, 'utf8');
        
        // --- FIX: Call the helper function to populate the HTML ---
        htmlContent = populateHtmlTemplate(htmlContent, businessData);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new'
        });

        const page = await browser.newPage();
        
        await page.setViewport({
            width: 1050,  // 3.5 inches * 300 DPI
            height: 600,  // 2 inches * 300 DPI
            deviceScaleFactor: 2
        });

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const cardElement = await page.$('.card-container');
        if (!cardElement) {
            throw new Error("Card container element (.card-container) not found in the HTML template.");
        }

        const imageBuffer = await cardElement.screenshot({
            type: 'png',
            omitBackground: true
        });

        await browser.close();
        return imageBuffer;

    } catch (error) {
        if (browser) await browser.close();
        console.error('Error generating visit card image:', error);
        throw new Error('Failed to generate business visit card. Please try again later.');
    }
};

// --- PROFESSIONAL EMAIL TEMPLATES ---

// 1. Business Welcome Email
exports.sendBusinessWelcomeEmail = async (userEmail, userName, businessData) => {
    try {
        const attachmentBuffer = await generateVisitCardImage(businessData);
        const attachmentOptions = {
            filename: `${businessData.slug || 'business'}-visit-card.png`,
            content: attachmentBuffer,
            contentType: 'image/png',
        };
       
    
        
        const emailContent = `
            <h2>Welcome to E-Visit, ${userName || 'Partner'}!</h2>
            <p>We're thrilled to welcome <strong>${businessData.title || 'your business'}</strong> to the E-Visit platform. Your business is now part of Kosovo's premier digital business directory.</p>
            <p>Attached to this email, you'll find your official <strong>E-Visit Partner Card</strong> - perfect for sharing on your website, social media, or printed materials.</p>
            <div class="divider"></div>
            <h3>Next Steps:</h3>
            <ul style="padding-left: 20px; margin: 15px 0;">
                <li style="margin-bottom: 8px;">Complete your business profile with photos and detailed information</li>
                <li style="margin-bottom: 8px;">Explore your analytics dashboard to track visitor engagement</li>
                <li style="margin-bottom: 8px;">Consider upgrading to premium features for greater visibility</li>
            </ul>
            <p>Our team is here to support your success. Don't hesitate to reach out if you have any questions.</p>
            <p style="margin-top: 25px;">Best regards,<br>
            <strong>E-Visit Partnership Team</strong></p>
        `;
        
        return transporter.sendMail({
            from: `"E-Visit Partnerships" <${process.env.SMTP_EMAIL}>`,
            to: userEmail,
            subject: `🚀 Welcome to E-Visit, ${businessData.title || 'New Partner'}!`,
            html: createBrandedEmail(emailContent, {
                preheader: `Get started with your new E-Visit business profile for ${businessData.title || 'your business'}`,
                
            }),
            attachments: [attachmentOptions],
        });
    } catch (error) {
        console.error("Error sending business welcome email:", error);
        throw error;
    }
};

// 2. Verification Email
exports.sendVerificationEmail = async (email, code) => {
 
  const emailContent = `
    <h2>Verify Your Email Address</h2>
    <p>Thank you for creating an account with E-Visit. To complete your registration, please verify your email address by entering the following code on our website:</p>
    <div class="code-box"><span class="code">${code}</span></div>
    <p>This verification code will expire in <strong>10 minutes</strong>. For your security, please do not share this code with anyone.</p>
    <p>If you didn't create an E-Visit account, you can safely ignore this email.</p>
  `;
  
  return transporter.sendMail({
    from: `"E-Visit Security" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "Verify Your E-Visit Account",
    html: createBrandedEmail(emailContent, {
        preheader: `Your E-Visit verification code: ${code}`,
       
    }),
  });
};

// 3. Password Reset Email
exports.sendResetCodeEmail = async (email, code) => {
  
  const emailContent = `
    <h2>Password Reset Request</h2>
    <p>We received a request to reset the password for your E-Visit account. To proceed, please use the following verification code:</p>
    <div class="code-box"><span class="code">${code}</span></div>
    <p>This code will expire in <strong>10 minutes</strong>. For your security, please do not share this code with anyone.</p>
    <p style="color: #DC2626;"><strong>Important:</strong> If you didn't request a password reset, please contact our support team immediately at <a href="mailto:support@evisit.com">support@evisit.com</a>.</p>
  `;
  
  return transporter.sendMail({
    from: `"E-Visit Security" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "E-Visit Password Reset Request",
    html: createBrandedEmail(emailContent, {
        preheader: `Your E-Visit password reset code: ${code}`,
       
    }),
  });
};

// 4. Contact Form Confirmation
exports.sendContactConfirmation = async (email, name, message) => {
  const emailContent = `
    <h2>Thank You for Contacting E-Visit</h2>
    <p>Dear ${name},</p>
    <p>We've received your message and appreciate you reaching out to us. Our team typically responds within <strong>24-48 hours</strong> during business days.</p>
    <h3>Your Message:</h3>
    <div class="quote">${message}</div>
    <p>For your records, here's a summary of your inquiry:</p>
    <ul style="padding-left: 20px; margin: 15px 0;">
        <li style="margin-bottom: 8px;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
        <li style="margin-bottom: 8px;"><strong>Contact Email:</strong> ${email}</li>
    </ul>
    <p>If you need immediate assistance, please call our support line at +383 49 000 000.</p>
    <p>Best regards,<br>
    <strong>E-Visit Customer Support</strong></p>
  `;
  
  return transporter.sendMail({
    from: `"E-Visit Support" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "We've Received Your Message",
    html: createBrandedEmail(emailContent, {
        preheader: "Thank you for contacting E-Visit. We've received your message."
    }),
  });
};

// 5. Admin Reply to Contact
exports.sendReplyToContact = async (to, subject, message) => {
  const emailContent = `
    <h2>${subject}</h2>
    ${message}
    <div class="divider"></div>
    <p>If you have any further questions, please reply to this email or contact our support team.</p>
    <p>Best regards,<br>
    <strong>E-Visit Support Team</strong></p>
  `;
  
  return transporter.sendMail({
    from: `"E-Visit Support" <${process.env.SMTP_EMAIL}>`,
    to: to,
    subject: `Re: ${subject}`,
    html: createBrandedEmail(emailContent),
  });
};

// 6. Collaboration Form Confirmation
exports.sendCollaborationConfirmation = async (email, name) => {
  const emailContent = `
    <h2>Thank You for Your Partnership Interest</h2>
    <p>Dear ${name},</p>
    <p>We appreciate your interest in collaborating with E-Visit. Our partnerships team has received your proposal and will review it carefully.</p>
    <h3>What to Expect Next:</h3>
    <ul style="padding-left: 20px; margin: 15px 0;">
        <li style="margin-bottom: 8px;">Initial review within <strong>3-5 business days</strong></li>
        <li style="margin-bottom: 8px;">Follow-up from our partnerships team</li>
        <li style="margin-bottom: 8px;">Potential meeting to discuss opportunities</li>
    </ul>
    <p>We value innovative partnerships that align with our mission to connect businesses with customers throughout Kosovo.</p>
    <p>For immediate inquiries, please contact our partnerships team at <a href="mailto:partnerships@evisit.com">partnerships@evisit.com</a>.</p>
    <p>Best regards,<br>
    <strong>E-Visit Partnerships Team</strong></p>
  `;
  
  return transporter.sendMail({
    from: `"E-Visit Partnerships" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "We've Received Your Collaboration Request",
    html: createBrandedEmail(emailContent, {
        preheader: "Thank you for your interest in partnering with E-Visit"
    }),
  });
};

// 7. New Feature Announcement (Example of additional template)
exports.sendFeatureAnnouncement = async (email, name) => {
  
  const emailContent = `
    <h2>Exciting New Features Now Available</h2>
    <p>Dear ${name},</p>
    <p>We're excited to share that E-Visit has launched powerful new features to help you connect with more customers:</p>
    <h3>What's New:</h3>
    <ul style="padding-left: 20px; margin: 15px 0;">
        <li style="margin-bottom: 8px;"><strong>Advanced Analytics:</strong> Track visitor engagement in real-time</li>
        <li style="margin-bottom: 8px;"><strong>Promotional Tools:</strong> Create special offers visible to all E-Visit users</li>
        <li style="margin-bottom: 8px;"><strong>Mobile Optimization:</strong> Improved experience for mobile visitors</li>
    </ul>
    <p>These features are available now in your business dashboard.</p>
  `;
  
  return transporter.sendMail({
    from: `"E-Visit Updates" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "New Features Available on E-Visit",
    html: createBrandedEmail(emailContent, {
        preheader: "Discover the latest features now available on E-Visit",
       
    }),
  });
};
// --- ADD THE NEW RECEIPT EMAIL FUNCTION ---
/**
 * Sends a purchase receipt email with a PDF attachment.
 * @param {object} user - The user object (must contain name and email).
 * @param {object} receiptData - The receipt record from the database.
 * @param {Buffer} pdfBuffer - The generated PDF as a buffer.
 * @returns {Promise} A promise from Nodemailer's sendMail function.
 */
exports.sendReceiptEmail = async (user, receiptData, pdfBuffer) => {
    try {
        console.log(`[Email] Preparing receipt email for: ${user.email}`);

        const emailContent = `
            <h2>Your Purchase from E-Visit</h2>
            <p>Dear ${user.name},</p>
            <p>Thank you for your recent purchase. We've attached the official receipt for your records. This includes your purchase of <strong>${receiptData.item_description}</strong>.</p>
            <p>If you have any questions about your purchase or your account, please don't hesitate to reply to this email.</p>
            <p>We're excited to have you with us!</p>
            <p style="margin-top: 25px;">Best regards,<br>
            <strong>The E-Visit Team</strong></p>
        `;

        const mailOptions = {
            from: `"E-Visit Billing" <${process.env.SMTP_EMAIL}>`,
            to: user.email,
            subject: `Your E-Visit Receipt [${receiptData.receipt_number}]`,
            html: createBrandedEmail(emailContent, {
                preheader: `Receipt for your purchase of ${receiptData.item_description}.`
            }),
            attachments: [{
                filename: `receipt-${receiptData.receipt_number}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };

        return transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error preparing or sending receipt email:", error);
        throw error; // Propagate the error up to the webhook handler
    }
};
/**
 * Sends an invoice email with a PDF attachment.
 * @param {object} invoice - The full invoice record from the database.
 * @param {Buffer} pdfBuffer - The generated invoice PDF as a buffer.
 * @returns {Promise} A promise from Nodemailer's sendMail function.
 */
exports.sendInvoiceEmail = async (invoice, pdfBuffer) => {
    try {
        console.log(`[Email] Preparing invoice email with PDF attachment for: ${invoice.recipient_email}`);

        // Helper function to format dates nicely, in case they are not pre-formatted.
        const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const emailContent = `
            <h2>Your Invoice from E-Visit</h2>
            <p>Dear ${invoice.recipient_name},</p>
            <p>Please find your invoice (<strong>#${invoice.invoice_number}</strong>) attached to this email for your records.</p>
            <p>The total amount due is <strong>$${Number(invoice.total_amount).toFixed(2)}</strong>, with a due date of <strong>${formatDate(invoice.due_date)}</strong>.</p>
            <p>If you have any questions about this invoice, please don't hesitate to reply to this email.</p>
            <p style="margin-top: 25px;">Thank you for your business,<br>
            <strong>The E-Visit Team</strong></p>
        `;

        const mailOptions = {
            from: `"E-Visit Invoicing" <${process.env.SMTP_EMAIL}>`,
            to: invoice.recipient_email,
            subject: `Invoice [${invoice.invoice_number}] from E-Visit`,
            html: createBrandedEmail(emailContent, { // Using your branded wrapper
                preheader: `Your invoice for $${Number(invoice.total_amount).toFixed(2)} from E-Visit.`
            }),
            attachments: [{ // Attaching the generated PDF
                filename: `invoice-${invoice.invoice_number}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };

        return transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error preparing or sending invoice email:", error);
        throw error; // Propagate the error up
    }
};
/*
* @param {object} offer - The full offer record from the database.
 * @param {Buffer} pdfBuffer - The generated offer PDF as a buffer.
 * @returns {Promise} A promise from Nodemailer's sendMail function.
 */
exports.sendOfferEmail = async (offer, pdfBuffer) => {
    try {
        console.log(`[Email] Preparing offer email with PDF attachment for: ${offer.recipient_email}`);

        // Helper function to format dates nicely.
        const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const emailContent = `
            <h2>Your Proposal from E-Visit</h2>
            <p>Dear ${offer.recipient_name},</p>
            <p>Thank you for the opportunity to present this offer. Please find our proposal (<strong>#${offer.offer_number}</strong>) attached to this email for your review.</p>
            <p>The total proposed amount is <strong>$${Number(offer.total_amount).toFixed(2)}</strong>. This offer is valid until <strong>${formatDate(offer.valid_until)}</strong>.</p>
            <p>We are confident that we can meet your needs and look forward to the possibility of working with you. Please let us know if you have any questions.</p>
            <p style="margin-top: 25px;">Best regards,<br>
            <strong>The E-Visit Team</strong></p>
        `;

        const mailOptions = {
            // Using a different sender name to distinguish from invoicing.
            from: `"E-Visit Proposals" <${process.env.SMTP_EMAIL}>`,
            to: offer.recipient_email,
            subject: `Proposal [${offer.offer_number}] from E-Visit`,
            html: createBrandedEmail(emailContent, { // Reusing your branded wrapper
                preheader: `Your proposal for $${Number(offer.total_amount).toFixed(2)} from E-Visit.`
            }),
            attachments: [{ // Attaching the generated offer PDF
                filename: `offer-${offer.offer_number}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };

        return transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error preparing or sending offer email:", error);
        throw error; // Propagate the error up
    }
};