const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
// const { protect } = require('../middleware/authMiddleware'); // Example of protecting routes

// --- Public Routes (for everyone) ---
// GET all PUBLISHED blog posts
router.get('/', blogController.getAllPublishedBlogs);

// GET a single blog post by its SLUG
router.get('/:slug', blogController.getBlogBySlug);


// --- Admin Routes (protected) ---
// GET all blog posts (drafts included) for the admin panel
// Note: You would have a middleware to check if the user is an admin
router.get('/admin/all', /* protect, */ blogController.getAllBlogsForAdmin);

// POST a new blog post
router.post('/', /* protect, */ blogController.createBlog);

// PUT (update) an existing blog post
router.put('/:id', /* protect, */ blogController.updateBlog);

// DELETE a blog post
router.delete('/:id', /* protect, */ blogController.deleteBlog);

module.exports = router;