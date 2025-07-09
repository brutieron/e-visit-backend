const db = require('../config/db');

const Collaboration = {
    // Create a new collaboration submission
    create: async (data) => {
        const { name, email, organization, collaboration_type, proposal_message } = data;
        const [result] = await db.query(
            'INSERT INTO collaborations (name, email, organization, collaboration_type, proposal_message) VALUES (?, ?, ?, ?, ?)',
            [name, email, organization || null, collaboration_type, proposal_message]
        );
        return result.insertId;
    },

    // Get all submissions for the admin panel
    findAll: async () => {
        const [rows] = await db.query('SELECT * FROM collaborations ORDER BY created_at DESC');
        return rows;
    },

    // Update the status of a submission
    updateStatus: async (id, status) => {
        const [result] = await db.query('UPDATE collaborations SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows > 0;
    },

    // Delete a submission
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM collaborations WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Collaboration;