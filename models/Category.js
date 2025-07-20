const db = require('../config/db');

const Category = {
  // Create a new category
  create: async ({ name, slug }) => {
    try {
      const [result] = await db.query(
        'INSERT INTO categories (name, slug) VALUES (?, ?)',
        [name, slug]
      );
      return result.insertId;
    } catch (error) {
      console.error("🔴 Category.create() Error:", error.message);
      throw error;
    }
  },

  // Get all categories
  findAll: async () => {
    try {
      const [rows] = await db.query(
        'SELECT * FROM categories ORDER BY name ASC'
      );
      return rows;
    } catch (error) {
      console.error("🔴 Category.findAll() Error:", error.message);
      throw error;
    }
  },

  // Update a category
  update: async (id, { name, slug }) => {
    try {
      const [result] = await db.query(
        'UPDATE categories SET name = ?, slug = ? WHERE id = ?',
        [name, slug, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("🔴 Category.update() Error:", error.message);
      throw error;
    }
  },

  // Delete a category
  delete: async (id) => {
    try {
      const [result] = await db.query(
        'DELETE FROM categories WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("🔴 Category.delete() Error:", error.message);
      throw error;
    }
  }
};

module.exports = Category;
