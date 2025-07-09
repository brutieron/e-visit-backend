// controllers/aiController.js
const { askAI } = require('../utils/aiLogic');

exports.handleAskRequest = async (req, res) => {
    const { userInput, language } = req.body;

    if (!userInput) {
        return res.status(400).json({ error: "userInput is required." });
    }

    try {
        const aiResponse = await askAI(userInput, language);
        res.status(200).json({ response: aiResponse });
    } catch (error) {
        console.error("Controller Error in handleAskRequest:", error);
        res.status(500).json({ error: "An internal server error occurred." });
    }
};