// controllers/knowledgeController.js
const fs = require('fs').promises;
const path = require('path');

const knowledgeBasePath = path.join(__dirname, '../data/aiEntries.json');

// Helper to read the knowledge base
const readKnowledgeBase = async () => {
    try {
        const data = await fs.readFile(knowledgeBasePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return empty array
        if (error.code === 'ENOENT') return [];
        throw error;
    }
};

// Helper to write to the knowledge base
const writeKnowledgeBase = async (data) => {
    await fs.writeFile(knowledgeBasePath, JSON.stringify(data, null, 2), 'utf-8');
};

// GET all entries
exports.getAllEntries = async (req, res) => {
    try {
        const entries = await readKnowledgeBase();
        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ message: "Error reading knowledge base", error });
    }
};

// POST a new entry
exports.addEntry = async (req, res) => {
    try {
        const { intent, responses } = req.body;
        if (!intent || !responses) {
            return res.status(400).json({ message: "Intent and responses are required." });
        }

        const entries = await readKnowledgeBase();
        const newEntry = {
            id: Date.now().toString(), // Simple unique ID
            intent,
            responses,
        };
        entries.push(newEntry);
        await writeKnowledgeBase(entries);
        res.status(201).json(newEntry);
    } catch (error) {
        res.status(500).json({ message: "Error adding new entry", error });
    }
};

// DELETE an entry by ID
exports.deleteEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const entries = await readKnowledgeBase();
        const filteredEntries = entries.filter(entry => entry.id !== id);

        if (entries.length === filteredEntries.length) {
            return res.status(404).json({ message: "Entry not found" });
        }

        await writeKnowledgeBase(filteredEntries);
        res.status(200).json({ message: "Entry deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting entry", error });
    }
};