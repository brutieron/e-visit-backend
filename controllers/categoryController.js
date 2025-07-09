const Category = require('../models/Category');

// GET ALL CATEGORIES (Public, Global)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json(categories);
    } catch (err) {
        console.error("Get All Categories Error:", err);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
};

// ADD A NEW CATEGORY (Admin, Global)
exports.addCategory = async (req, res) => {
    try {
        const { name, slug } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required.' });
        }
        
        const categoryId = await Category.create({ name, slug });
        res.status(201).json({ message: 'Category added successfully', categoryId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A category with this name or slug already exists.' });
        }
        console.error("Add Category Error:", err);
        res.status(500).json({ error: 'Failed to add category.' });
    }
};


// EDIT A CATEGORY (Admin)
exports.editCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Category.update(id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'Category not found or no changes were made.' });
        }
        res.json({ message: 'Category updated successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A category with this slug already exists.' });
        }
        console.error("Edit Category Error:", err);
        res.status(500).json({ error: 'Failed to update category.' });
    }
};

// DELETE A CATEGORY (Admin)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Category.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'Category not found.' });
        }
        res.json({ message: 'Category deleted successfully.' });
    } catch (err) {
        console.error("Delete Category Error:", err);
        res.status(500).json({ error: 'Failed to delete category.' });
    }
};