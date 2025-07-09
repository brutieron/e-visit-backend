const db = require('../config/db');

const City = {
    // Creates a new city
    create: async (cityData) => {
        const { slug, name, image, description } = cityData;
        const [result] = await db.query(
            'INSERT INTO cities (slug, name, image, description) VALUES (?, ?, ?, ?)',
            [slug, name, image, description]
        );
        return result.insertId;
    },

    // Updates an existing city
    update: async (id, cityData) => {
        const { slug, name, image, description } = cityData;
        const [result] = await db.query(
            'UPDATE cities SET slug = ?, name = ?, image = ?, description = ? WHERE id = ?',
            [slug, name, image, description, id]
        );
        return result.affectedRows > 0;
    },

    // Finds a single city by its ID
    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM cities WHERE id = ?', [id]);
        return rows[0];
    },

    // Finds a single city by its SLUG (useful for frontend URLs)
    findBySlug: async (slug) => {
        const [rows] = await db.query('SELECT * FROM cities WHERE slug = ?', [slug]);
        return rows[0];
    },

    // Finds all cities
    findAll: async () => {
        // We order by name alphabetically, which is a good default
        const [rows] = await db.query('SELECT * FROM cities ORDER BY name ASC');
        return rows;
    },

    // Deletes a city
    delete: async (id) => {
        // Professional Tip: In a real-world scenario, you might want to check
        // if any businesses are linked to this city before deleting it.
        // For now, a direct delete is fine.
        const [result] = await db.query('DELETE FROM cities WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = City;