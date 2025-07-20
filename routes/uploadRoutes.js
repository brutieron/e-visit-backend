const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

// ==============================================
//         MULTER CONFIGURATION FOR BLOGS
// ==============================================

const uploadDir = 'public/uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});

// ==============================================
//              SINGLE IMAGE UPLOAD
// ==============================================

router.post(
  '/',
  protect,
  authorizeRoles('admin', 'business'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a valid image file.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      message: '✅ Image uploaded successfully.',
      image: imageUrl,
    });
  }
);

// ==============================================
//              MULTIPLE IMAGES (Gallery)
// ==============================================

router.post(
  '/gallery',
  protect,
  authorizeRoles('admin', 'business'),
  upload.array('images', 10), // up to 10 images
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image.' });
    }

    const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
    return res.status(201).json({
      message: '✅ Gallery uploaded successfully.',
      images: imageUrls,
    });
  }
);

module.exports = router;
