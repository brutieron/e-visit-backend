// routes/uploadRoutes.js (Corrected Version)

const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

// --- Multer Configuration (No changes here) ---
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});
// --- End of Multer Configuration ---


// === Single Image Upload ===
// --- THE FIX IS HERE ---
// We now allow users with the 'admin' OR 'business' role to upload.
router.post('/', protect, authorizeRoles('admin', 'business'), upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Please upload a file.' });
  }

  // Remove 'public/' from the path to serve via /uploads
  const imageUrl = `/uploads/${req.file.filename}`;

  res.status(201).send({
    message: 'Image uploaded successfully',
    image: imageUrl
  });
});


// === Multiple Image Upload (Gallery) ===
// --- THE FIX IS HERE TOO ---
// We apply the same permission update to the gallery upload route.
router.post('/gallery', protect, authorizeRoles('admin', 'business'), upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send({ message: 'Please upload at least one file.' });
  }

  const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

  res.status(201).send({
    message: 'Images uploaded successfully',
    images: imageUrls
  });
});

module.exports = router;