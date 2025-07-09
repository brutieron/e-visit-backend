// routes/contactRoutes.js
const express = require("express");
const router = express.Router();
const { submitContact, replyToContact, getAllContacts } = require("../controllers/contactController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/", submitContact);
router.post("/reply", protect, authorizeRoles("admin"), replyToContact);
router.get("/all", protect, authorizeRoles("admin"), getAllContacts);


module.exports = router;
