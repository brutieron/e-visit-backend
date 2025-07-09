const db = require('../config/db'); // Your database connection
const slugify = require('slugify');

// GET all PUBLISHED blogs for the public-facing site
exports.getAllPublishedBlogs = async (req, res) => {
    try {
        const [blogs] = await db.query(
            "SELECT id, title, slug, excerpt, featured_image_url, author_name, published_at FROM blogs WHERE status = 'published' ORDER BY published_at DESC"
        );
        res.json(blogs);
    } catch (error) {
        console.error("Error in getAllPublishedBlogs:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// GET a single blog by its SLUG
exports.getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const [rows] = await db.query("SELECT * FROM blogs WHERE slug = ? AND status = 'published'", [slug]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error("Error in getBlogBySlug:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Admin Functions ---

// GET ALL blogs for the admin panel (includes drafts)
exports.getAllBlogsForAdmin = async (req, res) => {
    try {
        const [blogs] = await db.query("SELECT id, title, slug, status, created_at, updated_at FROM blogs ORDER BY created_at DESC");
        res.json(blogs);
    } catch (error) {
        console.error("Error in getAllBlogsForAdmin:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// CREATE a new blog post
exports.createBlog = async (req, res) => {
    try {
        const { title, content, excerpt, status, meta_title, meta_description, featured_image_url, author_name } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required.' });
        }

        // Generate slug
        const slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

        // Set published_at if status is 'published' for the first time
        const published_at = status === 'published' ? new Date() : null;

        const [result] = await db.query(
            "INSERT INTO blogs (title, slug, content, excerpt, status, meta_title, meta_description, featured_image_url, author_name, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [title, slug, content, excerpt, status, meta_title, meta_description, featured_image_url, author_name, published_at]
        );
        
        res.status(201).json({ message: 'Blog created successfully', id: result.insertId });
    } catch (error) {
        console.error("Error in createBlog:", error);
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ message: 'A blog post with this title already exists. Please choose a different title.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// ** NEW ** UPDATE an existing blog post
exports.updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, excerpt, status, meta_title, meta_description, featured_image_url, author_name } = req.body;

        // Fetch the existing post to check its status
        const [existingPostRows] = await db.query("SELECT status, published_at FROM blogs WHERE id = ?", [id]);
        if (existingPostRows.length === 0) {
            return res.status(404).json({ message: "Blog post not found." });
        }
        const existingPost = existingPostRows[0];
        
        // Regenerate slug in case the title has changed
        const slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

        // Logic for published_at: only set it if the post is moving from 'draft' to 'published'
        let published_at = existingPost.published_at;
        if (status === 'published' && existingPost.status === 'draft') {
            published_at = new Date();
        }

        const [result] = await db.query(
            "UPDATE blogs SET title = ?, slug = ?, content = ?, excerpt = ?, status = ?, meta_title = ?, meta_description = ?, featured_image_url = ?, author_name = ?, published_at = ? WHERE id = ?",
            [title, slug, content, excerpt, status, meta_title, meta_description, featured_image_url, author_name, published_at, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Blog post not found or no changes made." });
        }
        
        res.status(200).json({ message: 'Blog updated successfully' });
    } catch (error) {
        console.error("Error in updateBlog:", error);
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ message: 'Another post with this title already exists. Please choose a different title.' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// ** NEW ** DELETE a blog post
exports.deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query("DELETE FROM blogs WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Blog post not found." });
        }

        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (error) {
        console.error("Error in deleteBlog:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};