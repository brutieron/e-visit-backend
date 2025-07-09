const db = require('../config/db');

const VerificationCode = {
    // Creates a new verification code
    create: async (email) => {
        // First, delete any existing codes for this email to prevent conflicts
        await VerificationCode.delete(email); 
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); // 10 min
        
        await db.query('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)', [
            email, code, expiresAt
        ]);
        
        return code; // Return the code so it can be emailed
    },
    
    // Finds and validates a code
    find: async (email, code) => {
        const [rows] = await db.query(
            'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND expires_at > NOW()',
            [email, code]
        );
        return rows[0]; // Returns the code object if valid and not expired, otherwise undefined
    },
    
    // Deletes all codes for a given email
    delete: async (email) => {
        await db.query('DELETE FROM email_verifications WHERE email = ?', [email]);
    }
};

module.exports = VerificationCode;