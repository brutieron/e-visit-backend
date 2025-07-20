const Category = require('../models/Category');

// GET ALL CATEGORIES
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json(categories);
  } catch (err) {
    console.error("🔴 Get All Categories Error:", err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
};

// ADD A NEW CATEGORY
exports.addCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required.' });
    }

    const categoryId = await Category.create({ name, slug });

    res.status(201).json({
      message: '✅ Category added successfully.',
      categoryId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'A category with this name or slug already exists.',
      });
    }

    console.error("🔴 Add Category Error:", err);
    res.status(500).json({ error: 'Failed to add category.' });
  }
};

// EDIT CATEGORY
exports.editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required.' });
    }

    const updated = await Category.update(id, { name, slug });

    if (!updated) {
      return res.status(404).json({ error: 'Category not found or no changes were made.' });
    }

    res.status(200).json({ message: '✅ Category updated successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'A category with this slug already exists.',
      });
    }

    console.error("🔴 Edit Category Error:", err);
    res.status(500).json({ error: 'Failed to update category.' });
  }
};

// DELETE CATEGORY
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.status(200).json({ message: '✅ Category deleted successfully.' });
  } catch (err) {
    console.error("🔴 Delete Category Error:", err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
};
