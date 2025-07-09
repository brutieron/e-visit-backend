const db = require('../config/db');

const Category = {
    // Creates a new GLOBAL category
    create: async (categoryData) => {
        const { name, slug } = categoryData;
        const [result] = await db.query(
            'INSERT INTO categories (name, slug) VALUES (?, ?)',
            [name, slug]
        );
        return result.insertId;
    },

    // Finds all global categories
    findAll: async () => {
        const [rows] = await db.query('SELECT * FROM categories ORDER BY name ASC');
        return rows;
    },
    
    // Updates a category
    update: async (id, categoryData) => {
        const { name, slug } = categoryData;
        const [result] = await db.query(
            'UPDATE categories SET name = ?, slug = ? WHERE id = ?',
            [name, slug, id]
        );
        return result.affectedRows > 0;
    },

    // Deletes a category
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Category;