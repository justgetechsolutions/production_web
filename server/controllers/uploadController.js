const path = require('path');

exports.uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Assuming static files are served from /uploads
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
}; 