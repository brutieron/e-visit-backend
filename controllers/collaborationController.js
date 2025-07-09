const Collaboration = require('../models/Collaboration');
// Import the specific email functions we need
const { sendCollaborationConfirmation } = require('../utils/nodemailer');

// Public: Handle form submission and send confirmation email
exports.submitCollaboration = async (req, res) => {
    try {
        const { name, email, collaboration_type, proposal_message } = req.body;
        if (!name || !email || !collaboration_type || !proposal_message) {
            return res.status(400).json({ error: 'Please fill out all required fields.' });
        }
        
        // 1. Save the submission to the database
        await Collaboration.create(req.body);

        // 2. Send the automated confirmation email to the user
        await sendCollaborationConfirmation(email, name);

        // 3. Send a success response back to the frontend
        res.status(201).json({ message: 'Collaboration request submitted successfully. We will get back to you soon!' });

    } catch (err) {
        console.error("Collaboration Submission Error:", err);
        res.status(500).json({ error: 'An error occurred while submitting your request.' });
    }
};

// ===============================================
//               ADMIN-ONLY FUNCTIONS
// ===============================================

// Admin: Get all submissions
exports.getAllCollaborations = async (req, res) => {
    try {
        const submissions = await Collaboration.findAll();
        res.json(submissions);
    } catch (err) {
        console.error("Get All Collaborations Error:", err);
        res.status(500).json({ error: 'Failed to fetch collaboration requests.' });
    }
};

// Admin: Update submission status
exports.updateCollaborationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Validate the status to ensure it's one of the allowed values
        const allowedStatuses = ['new', 'read', 'contacted', 'archived'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'A valid status is required.' });
        }
        
        const success = await Collaboration.updateStatus(id, status);
        if (!success) {
            return res.status(404).json({ error: 'Submission not found.' });
        }
        res.json({ message: `Submission status updated to ${status}` });
    } catch (err) {
        console.error("Update Collaboration Status Error:", err);
        res.status(500).json({ error: 'Failed to update status.' });
    }
};

// Admin: Delete a submission
exports.deleteCollaboration = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Collaboration.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'Submission not found.' });
        }
        res.json({ message: 'Collaboration request deleted successfully.' });
    } catch (err) {
        console.error("Delete Collaboration Error:", err);
        res.status(500).json({ error: 'Failed to delete request.' });
    }
};