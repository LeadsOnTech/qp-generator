const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg'];

function sanitizeFilename(original) {
  // Keep the name predictable and safe: letters, numbers, dash, underscore, dot only.
  const ext = original.split('.').pop().toLowerCase();
  const base = original.slice(0, original.length - ext.length - 1)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  return { base, ext };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const { base, ext } = sanitizeFilename(file.originalname);
    cb(null, `${base}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per image — diagrams should be small
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Unsupported image type ".${ext}" — only PNG and JPG/JPEG are accepted.`));
    }
    cb(null, true);
  },
});

/**
 * POST /api/images/upload
 * Body: multipart/form-data, field "images" — accepts MULTIPLE files at once,
 * since a chapter's diagrams are usually uploaded as a batch alongside the Excel.
 * Each file's saved (sanitized) filename is what you reference in the Excel's
 * ImageFilename column.
 */
router.post('/upload', (req, res) => {
  upload.array('images', 100)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded. Attach one or more files under field "images".' });
    }
    res.json({
      uploaded: req.files.map((f) => ({
        originalName: f.originalname,
        savedFilename: f.filename,
        sizeBytes: f.size,
      })),
    });
  });
});

/**
 * GET /api/images — list every uploaded image (so users can check exact
 * saved filenames to reference in their Excel's ImageFilename column).
 */
router.get('/', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).filter((f) => {
    const ext = f.split('.').pop().toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  });
  res.json({
    images: files.map((f) => ({
      filename: f,
      url: `/uploads/images/${f}`,
    })),
  });
});

/**
 * DELETE /api/images/:filename — delete an image and unlink from questions
 */
router.delete('/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      return res.status(500).json({ error: `Could not delete file: ${err.message}` });
    }
  }

  res.json({ ok: true, deleted: filename });
});

/**
 * POST /api/images/bulk-delete — delete multiple images at once
 */
router.post('/bulk-delete', async (req, res) => {
  const { filenames } = req.body;
  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: 'filenames must be a non-empty array of strings.' });
  }

  let deletedCount = 0;
  const safeFilenames = filenames.map((f) => path.basename(f));

  for (const filename of safeFilenames) {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        console.error(`Could not delete ${filename}:`, err);
      }
    }
  }

  res.json({ ok: true, deletedCount });
});

/**
 * POST /api/images/rename — rename an image file and update references
 */
router.post('/rename', async (req, res) => {
  const { oldFilename, newFilename } = req.body;
  if (!oldFilename || !newFilename) {
    return res.status(400).json({ error: 'oldFilename and newFilename are required.' });
  }

  const cleanOld = path.basename(oldFilename);
  const cleanNew = path.basename(newFilename).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const oldPath = path.join(UPLOAD_DIR, cleanOld);
  const newPath = path.join(UPLOAD_DIR, cleanNew);

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ error: 'Image not found.' });
  }
  if (fs.existsSync(newPath) && cleanOld !== cleanNew) {
    return res.status(400).json({ error: 'A file with that name already exists.' });
  }

  try {
    fs.renameSync(oldPath, newPath);
  } catch (err) {
    return res.status(500).json({ error: `Could not rename file: ${err.message}` });
  }

  // Update questions referencing oldFilename to newFilename
  try {
    const prisma = require('../db');
    await prisma.question.updateMany({
      where: { imageFilename: cleanOld },
      data: { imageFilename: cleanNew },
    });
    await prisma.question.updateMany({
      where: { optionAImage: cleanOld },
      data: { optionAImage: cleanNew },
    });
    await prisma.question.updateMany({
      where: { optionBImage: cleanOld },
      data: { optionBImage: cleanNew },
    });
    await prisma.question.updateMany({
      where: { optionCImage: cleanOld },
      data: { optionCImage: cleanNew },
    });
    await prisma.question.updateMany({
      where: { optionDImage: cleanOld },
      data: { optionDImage: cleanNew },
    });
  } catch (err) {
    console.error('Error updating question image references:', err);
  }

  res.json({ ok: true, oldFilename: cleanOld, newFilename: cleanNew });
});

module.exports = router;
