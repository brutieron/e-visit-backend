const express = require("express");
const router = express.Router();
const cityController = require("../controllers/cityController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

// =======================================
//          PUBLIC ROUTES (NO AUTH)
// =======================================

// Get a list of all available cities
router.get("/", cityController.getAllCities);

// Get details for a single city using its slug (e.g., /api/cities/prishtina)
router.get("/:slug", cityController.getCityBySlug);


// =======================================
//          ADMIN ROUTES (ADMIN AUTH)
// =======================================

// Add a new city
router.post("/", protect, authorizeRoles("admin"), cityController.addCity);

// Edit an existing city by its ID
router.put("/:id", protect, authorizeRoles("admin"), cityController.editCity);

// Delete a city by its ID
router.delete("/:id", protect, authorizeRoles("admin"), cityController.deleteCity);


module.exports = router;