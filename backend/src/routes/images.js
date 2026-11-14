const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../db');
const {
  isAutoDeleteDiagramsEnabled,
  setAutoDeleteDiagramsEnabled,
  findOrphanedImages,
} = require('../lib/diagramCleaner');

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

// In-memory buffer allows computing SHA-256 hash before saving to disk to detect duplicate uploads
const storage = multer.memoryStorage();

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
 * GET /api/images/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const autoDelete = await isAutoDeleteDiagramsEnabled();
    res.json({ autoDeleteDiagrams: autoDelete });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/images/settings
 * Body: { autoDeleteDiagrams: boolean }
 */
router.put('/settings', async (req, res) => {
  try {
    const { autoDeleteDiagrams } = req.body;
    await setAutoDeleteDiagramsEnabled(Boolean(autoDeleteDiagrams));
    res.json({ ok: true, autoDeleteDiagrams: Boolean(autoDeleteDiagrams) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/images/purge-orphans
 * Deletes all image files on disk that are NOT referenced by any active question.
 */
router.post('/purge-orphans', async (req, res) => {
  try {
    const { orphaned } = await findOrphanedImages();
    let deletedCount = 0;
    const deletedFiles = [];
    for (const filename of orphaned) {
      const filePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
          deletedFiles.push(filename);
        } catch (e) {
          console.error(`Failed to delete orphaned file ${filename}:`, e.message);
        }
      }
    }
    res.json({ ok: true, deletedCount, deletedFiles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to purge orphaned diagrams: ' + err.message });
  }
});

/**
 * POST /api/images/upload
 * Body: multipart/form-data, field "images" — accepts MULTIPLE files at once.
 * Intelligently detects duplicates by both filename and SHA-256 pixel content hash.
 */
router.post('/upload', (req, res) => {
  upload.array('images', 200)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded. Attach one or more files under field "images".' });
    }

    const existingFiles = fs.readdirSync(UPLOAD_DIR).filter((f) => {
      const ext = f.split('.').pop().toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });

    const existingHashMap = new Map(); // hash -> filename
    for (const f of existingFiles) {
      try {
        const filePath = path.join(UPLOAD_DIR, f);
        const buf = fs.readFileSync(filePath);
        const h = crypto.createHash('sha256').update(buf).digest('hex');
        existingHashMap.set(h, f);
      } catch (e) {}
    }

    const uploaded = [];
    const duplicates = [];
    const newlyUploaded = [];
    const sharedDiagrams = [];

    for (const file of req.files) {
      const { base, ext } = sanitizeFilename(file.originalname);
      const savedFilename = `${base}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, savedFilename);
      const incomingHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      const exists = fs.existsSync(filePath);

      if (exists) {
        let existingHash = null;
        try {
          const existingBuf = fs.readFileSync(filePath);
          existingHash = crypto.createHash('sha256').update(existingBuf).digest('hex');
        } catch (e) {}

        if (existingHash === incomingHash) {
          // Exact identical file already in library
          duplicates.push({
            savedFilename,
            originalName: file.originalname,
            sizeBytes: file.size,
            reason: 'Already exists in library with identical filename and image content.',
            status: 'EXACT_DUPLICATE',
          });
          uploaded.push({
            savedFilename,
            originalName: file.originalname,
            sizeBytes: file.size,
            isDuplicate: true,
          });
        } else {
          // Same filename uploaded with updated image content
          fs.writeFileSync(filePath, file.buffer);
          existingHashMap.set(incomingHash, savedFilename);
          duplicates.push({
            savedFilename,
            originalName: file.originalname,
            sizeBytes: file.size,
            reason: 'Updated version: replaced previous image with new version.',
            status: 'UPDATED',
          });
          uploaded.push({
            savedFilename,
            originalName: file.originalname,
            sizeBytes: file.size,
            isUpdated: true,
          });
        }
      } else {
        // File does not exist under this name
        const contentMatch = existingHashMap.get(incomingHash);
        const isOption = /_[A-D]\.(png|jpg|jpeg|webp|svg)$/i.test(savedFilename) || /opt[A-D]/i.test(savedFilename);
        const matchIsOption = contentMatch ? (/_[A-D]\.(png|jpg|jpeg|webp|svg)$/i.test(contentMatch) || /opt[A-D]/i.test(contentMatch)) : false;

        // Write the new file
        fs.writeFileSync(filePath, file.buffer);
        existingHashMap.set(incomingHash, savedFilename);
        newlyUploaded.push({
          savedFilename,
          originalName: file.originalname,
          sizeBytes: file.size,
        });

        if (contentMatch) {
          const isSharedOption = isOption || matchIsOption;
          const sharedInfo = {
            savedFilename,
            originalName: file.originalname,
            sizeBytes: file.size,
            matchingFile: contentMatch,
            reason: isSharedOption
              ? `Shared Option Diagram: Reusable chemical structure matching "${contentMatch}". Saved as its own file and ready to reference in Excel.`
              : `Shared Diagram: Reusable image matching "${contentMatch}". Saved as its own file and ready to reference in Excel.`,
            status: isSharedOption ? 'SHARED_OPTION' : 'SHARED_CONTENT',
            isOption: isSharedOption,
          };
          sharedDiagrams.push(sharedInfo);
          // For backwards compatibility, add to duplicates list with friendly status
          duplicates.push(sharedInfo);

          uploaded.push({
            savedFilename,
            originalName: file.originalname,
            sizeBytes: file.size,
            isNew: true,
            isDuplicate: false,
            isShared: true,
            sharedWith: contentMatch,
          });
        } else {
          uploaded.push({
            savedFilename,
            originalName: file.originalname,
            sizeBytes: file.size,
            isNew: true,
            isDuplicate: false,
          });
        }
      }
    }

    const exactDuplicateCount = duplicates.filter((d) => d.status === 'EXACT_DUPLICATE').length;

    res.json({
      uploaded,
      totalProcessed: req.files.length,
      newCount: newlyUploaded.length,
      duplicateCount: exactDuplicateCount,
      duplicates,
      sharedCount: sharedDiagrams.length,
      sharedDiagrams,
    });
  });
});

/**
 * GET /api/images/duplicates — scans the entire library for identical images
 * sharing the same content hash under different filenames.
 */
router.get('/duplicates', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).filter((f) => {
      const ext = f.split('.').pop().toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });

    const hashMap = new Map(); // hash -> array of { filename, sizeBytes, mtime }
    for (const f of files) {
      try {
        const filePath = path.join(UPLOAD_DIR, f);
        const stat = fs.statSync(filePath);
        const buf = fs.readFileSync(filePath);
        const h = crypto.createHash('sha256').update(buf).digest('hex');
        if (!hashMap.has(h)) hashMap.set(h, []);
        hashMap.get(h).push({ filename: f, sizeBytes: stat.size, mtime: stat.mtime });
      } catch (e) {}
    }

    const duplicateGroups = [];
    for (const [hash, group] of hashMap.entries()) {
      if (group.length > 1) {
        duplicateGroups.push({
          hash,
          sizeBytes: group[0].sizeBytes,
          count: group.length,
          files: group,
        });
      }
    }

    res.json({
      duplicateGroups,
      totalDuplicateFiles: duplicateGroups.reduce((acc, g) => acc + g.count, 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan duplicates: ' + err.message });
  }
});

/**
 * GET /api/images — list every uploaded image (so users can check exact
 * saved filenames to reference in their Excel's ImageFilename column).
 * Includes file sizes, upload timestamps, linked questions, and orphaned indicators.
 */
router.get('/', async (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).filter((f) => {
      const ext = f.split('.').pop().toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });

    const [orphanData, autoDelete] = await Promise.all([
      findOrphanedImages().catch(() => ({ orphaned: [], usedFilesMap: new Map() })),
      isAutoDeleteDiagramsEnabled(),
    ]);

    let totalBytes = 0;
    const imageList = files.map((f) => {
      let sizeBytes = 0;
      let mtime = null;
      try {
        const stat = fs.statSync(path.join(UPLOAD_DIR, f));
        sizeBytes = stat.size;
        mtime = stat.mtime;
        totalBytes += stat.size;
      } catch (e) {}

      const cleanName = path.basename(f);
      const linked = orphanData.usedFilesMap.get(cleanName) || [];
      const isOrphaned = linked.length === 0;

      return {
        filename: f,
        url: `/uploads/images/${f}`,
        sizeBytes,
        mtime,
        linkedQuestions: linked,
        linkedCount: linked.length,
        isOrphaned,
      };
    });

    // Sort by upload/modification date descending (newest first)
    imageList.sort((a, b) => {
      if (!a.mtime || !b.mtime) return 0;
      return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
    });

    const orphanedCount = imageList.filter((img) => img.isOrphaned).length;

    res.json({
      images: imageList,
      totalCount: imageList.length,
      totalBytes,
      orphanedCount,
      autoDeleteDiagrams: autoDelete,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read images: ' + err.message });
  }
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

  // Clear references from questions
  for (const filename of safeFilenames) {
    try {
      await prisma.question.updateMany({ where: { imageFilename: filename }, data: { imageFilename: null } });
      await prisma.question.updateMany({ where: { optionAImage: filename }, data: { optionAImage: null } });
      await prisma.question.updateMany({ where: { optionBImage: filename }, data: { optionBImage: null } });
      await prisma.question.updateMany({ where: { optionCImage: filename }, data: { optionCImage: null } });
      await prisma.question.updateMany({ where: { optionDImage: filename }, data: { optionDImage: null } });
    } catch (e) {}
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

  // Clear references from questions so questions aren't pointing to a missing image
  try {
    await prisma.question.updateMany({ where: { imageFilename: filename }, data: { imageFilename: null } });
    await prisma.question.updateMany({ where: { optionAImage: filename }, data: { optionAImage: null } });
    await prisma.question.updateMany({ where: { optionBImage: filename }, data: { optionBImage: null } });
    await prisma.question.updateMany({ where: { optionCImage: filename }, data: { optionCImage: null } });
    await prisma.question.updateMany({ where: { optionDImage: filename }, data: { optionDImage: null } });
  } catch (err) {}

  res.json({ ok: true, deleted: filename });
});

module.exports = router;
