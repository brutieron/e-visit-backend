// models/Business.js

const db = require('../config/db');
const slugify = require('slugify');

const Business = {};

// Creates a new business listing AND returns the full new object
Business.create = async (businessData, userId) => {
    // 1. Prepare data for insertion
    const { 
        city_id, category_id, title, main_image, images, 
        description, map_link, contact_email, contact_whatsapp 
    } = businessData;
    
    // Create a URL-friendly slug from the title
    const slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    const imagesJson = JSON.stringify(images || []);

    const sql = `
        INSERT INTO businesses (
            user_id, city_id, category_id, slug, title, main_image, images, 
            description, map_link, contact_email, contact_whatsapp, is_visible, is_boosted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, false);
    `;
    const values = [
        userId, city_id, category_id, slug, title, main_image, imagesJson, 
        description, map_link, contact_email, contact_whatsapp
    ];

    try {
        // 2. Insert the new business
        const [result] = await db.query(sql, values);
        const newBusinessId = result.insertId;

        // 3. Immediately fetch and return the complete new business object using the corrected findById
        return Business.findById(newBusinessId);
    } catch (err) {
        console.error("Error in Business.create model:", err);
        throw err;
    }
};

// Updates an existing business listing
Business.update = async (businessId, businessData) => {
    // Prepare data for update
    const { 
        city_id, category_id, title, main_image, images, description, 
        map_link, contact_email, contact_whatsapp, is_visible 
    } = businessData;

    const slug = slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    const imagesJson = JSON.stringify(images || []);

    const sql = `
        UPDATE businesses SET 
         city_id = ?, category_id = ?, slug = ?, title = ?, main_image = ?, images = ?, 
         description = ?, map_link = ?, contact_email = ?, contact_whatsapp = ?,
         is_visible = ?
         WHERE id = ?;
    `;
    const values = [
        city_id, category_id, slug, title, main_image, imagesJson, description, 
        map_link, contact_email, contact_whatsapp, is_visible, businessId
    ];
    
    const [result] = await db.query(sql, values);
    return result.affectedRows > 0;
};

// --- CORRECTED: Finds a single business by its ID with city/category names ---
Business.findById = async (id) => {
    const sql = `
        SELECT 
            b.*, 
            c.name as city_name, 
            cat.name as category_name
        FROM businesses b
        LEFT JOIN cities c ON b.city_id = c.id
        LEFT JOIN categories cat ON b.category_id = cat.id
        WHERE b.id = ?;
    `;
    const [rows] = await db.query(sql, [id]);
    if (rows[0] && rows[0].images) {
        rows[0].images = JSON.parse(rows[0].images || '[]');
    }
    return rows[0];
};
    
// --- CORRECTED: Finds a business owned by a user with city/category names ---
Business.findByUserId = async (userId) => {
    const sql = `
        SELECT 
            b.*, 
            c.name as city_name, 
            cat.name as category_name
        FROM businesses b
        LEFT JOIN cities c ON b.city_id = c.id
        LEFT JOIN categories cat ON b.category_id = cat.id
        WHERE b.user_id = ?;
    `;
    const [rows] = await db.query(sql, [userId]);
    if (rows[0] && rows[0].images) {
        rows[0].images = JSON.parse(rows[0].images || '[]');
    }
    return rows[0];
};

// Finds all businesses (for public-facing pages) with city and category info
Business.findAllPublic = async (filters = {}) => {
    // This function was already correct, no changes needed
    let sql = `
        SELECT b.*, c.name as city_name, cat.name as category_name 
        FROM businesses b
        LEFT JOIN cities c ON b.city_id = c.id
        LEFT JOIN categories cat ON b.category_id = cat.id
        WHERE b.is_visible = true
    `;
    const params = [];
    if (filters.city_slug) {
        sql += ' AND c.slug = ?';
        params.push(filters.city_slug);
    }
    if (filters.category_slug) {
        sql += ' AND cat.slug = ?';
        params.push(filters.category_slug);
    }
    sql += ' ORDER BY b.is_boosted DESC, b.created_at DESC';
    const [rows] = await db.query(sql, params);
    rows.forEach(row => row.images = JSON.parse(row.images || '[]'));
    return rows;
};

// Finds all businesses for the admin dashboard with ALL related info
Business.findAllForAdmin = async () => {
    // This function was already correct, no changes needed
    const sql = `
        SELECT 
            b.*, u.name AS user_name, u.email AS user_email,
            c.name AS city_name, cat.name AS category_name
        FROM businesses b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN cities c ON b.city_id = c.id
        LEFT JOIN categories cat ON b.category_id = cat.id
        ORDER BY b.created_at DESC;
    `;
    const [rows] = await db.query(sql);
    rows.forEach(row => { row.images = JSON.parse(row.images || '[]'); });
    return rows;
};
    
// Deletes a business
Business.delete = async (id) => {
    const [result] = await db.query('DELETE FROM businesses WHERE id = ?', [id]);
    return result.affectedRows > 0;
};
    
// Checks if a user already owns a business
Business.checkOwnership = async (userId) => {
    const [rows] = await db.query('SELECT id FROM businesses WHERE user_id = ?', [userId]);
    return rows[0];
};
// --- ✅ NEW FUNCTION ADDED HERE ---
/**
 * Finds multiple businesses by an array of their IDs.
 * This is used for the "My Favorites" page.
 * @param {number[]} ids - An array of business IDs, e.g., [1, 5, 12].
 * @returns {Promise<Object[]>} - A promise that resolves to an array of business objects.
 */
Business.findByIds = async (ids) => {
  // If the array of IDs is empty, return an empty array immediately to prevent a SQL error.
  if (!ids || ids.length === 0) {
    return [];
  }
  
  // The `IN (?)` syntax with an array parameter is a secure and efficient way 
  // to select multiple rows based on a list of values.
  const sql = `
    SELECT 
        b.*, 
        c.name as city_name, 
        cat.name as category_name
    FROM businesses b
    LEFT JOIN cities c ON b.city_id = c.id
    LEFT JOIN categories cat ON b.category_id = cat.id
    WHERE b.id IN (?);
  `;
  
  const [rows] = await db.query(sql, [ids]);
  
  // Just like in your other functions, we need to parse the 'images' JSON string.
  rows.forEach(row => {
    if (row.images) {
      row.images = JSON.parse(row.images || '[]');
    }
  });

  return rows;
};

module.exports = Business;