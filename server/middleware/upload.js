const multer = require('multer');

// Multer memory storage for receipt uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;
