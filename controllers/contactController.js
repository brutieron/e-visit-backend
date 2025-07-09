const db = require("../config/db");
const { sendContactConfirmation } = require("../utils/nodemailer");

exports.submitContact = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    await db.query(
      "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)",
      [name, email, message]
    );

    await sendContactConfirmation(email, name, message);

    res.status(200).json({ success: true, message: "Message submitted successfully." });
  } catch (err) {
    console.error("Error saving contact:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// 🧠 Admin reply logic (optional route you'll call from dashboard)
exports.replyToContact = async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    const { sendReplyToContact } = require("../utils/nodemailer");
    await sendReplyToContact(to, subject, message);
    res.status(200).json({ success: true, message: "Reply sent successfully." });
  } catch (err) {
    console.error("Reply error:", err);
    res.status(500).json({ error: "Failed to send reply." });
  }
};

// 📥 Get all contact messages (for admin dashboard)
exports.getAllContacts = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM contacts ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Fetch contacts failed:", err);
    res.status(500).json({ error: "Failed to load contacts." });
  }
};
