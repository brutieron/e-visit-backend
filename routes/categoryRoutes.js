const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

// =======================================
//          PUBLIC ROUTES (NO AUTH)
// =======================================

router.get("/", categoryController.getAllCategories);

// =======================================
//          ADMIN ROUTES (REQUIRES AUTH)
// =======================================

router.post("/", protect, authorizeRoles("admin"), categoryController.addCategory);
router.put("/:id", protect, authorizeRoles("admin"), categoryController.editCategory);
router.delete("/:id", protect, authorizeRoles("admin"), categoryController.deleteCategory);

module.exports = router;
