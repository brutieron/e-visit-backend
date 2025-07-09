const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

// =======================================
//          PUBLIC ROUTES (NO AUTH)
// =======================================

// Get a list of all available categories
router.get("/", categoryController.getAllCategories);


// =======================================
//          ADMIN ROUTES (ADMIN AUTH)
// =======================================

// Add a new category
router.post("/", protect, authorizeRoles("admin"), categoryController.addCategory);

// Edit an existing category by its ID
router.put("/:id", protect, authorizeRoles("admin"), categoryController.editCategory);

// Delete a category by its ID
router.delete("/:id", protect, authorizeRoles("admin"), categoryController.deleteCategory);


module.exports = router;