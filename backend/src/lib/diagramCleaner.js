const fs = require('fs');
const path = require('path');
const prisma = require('../db');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Checks whether the auto-delete diagrams setting is enabled.
 * Defaults to true.
 */
async function isAutoDeleteDiagramsEnabled() {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: 'auto_delete_question_diagrams' },
    });
    if (!row) return true; // Enabled by default
    return row.value !== 'false';
  } catch (e) {
    return true;
  }
}

/**
 * Sets the auto-delete diagrams setting.
 */
async function setAutoDeleteDiagramsEnabled(enabled) {
  return prisma.appSetting.upsert({
    where: { key: 'auto_delete_question_diagrams' },
    update: { value: String(Boolean(enabled)) },
    create: { key: 'auto_delete_question_diagrams', value: String(Boolean(enabled)) },
  });
}

/**
 * Extracts all non-empty image filenames from a question or list of questions.
 */
function extractImageFilenames(questions = []) {
  const filenames = new Set();
  const list = Array.isArray(questions) ? questions : [questions];
  for (const q of list) {
    if (!q) continue;
    if (q.imageFilename && typeof q.imageFilename === 'string') filenames.add(q.imageFilename.trim());
    if (q.optionAImage && typeof q.optionAImage === 'string') filenames.add(q.optionAImage.trim());
    if (q.optionBImage && typeof q.optionBImage === 'string') filenames.add(q.optionBImage.trim());
    if (q.optionCImage && typeof q.optionCImage === 'string') filenames.add(q.optionCImage.trim());
    if (q.optionDImage && typeof q.optionDImage === 'string') filenames.add(q.optionDImage.trim());
  }
  return Array.from(filenames).filter(Boolean);
}

/**
 * Given a list of image filenames, safely deletes physical files from disk
 * IF AND ONLY IF no remaining active question in the database references them.
 * 
 * @param {string[]} imageFilenames 
 * @param {string[]} excludeQuestionIds - Question IDs that are being deleted / excluded
 * @returns {Promise<{ deletedFiles: string[], preservedFiles: string[] }>}
 */
async function purgeUnreferencedImages(imageFilenames = [], excludeQuestionIds = []) {
  if (!imageFilenames || imageFilenames.length === 0) {
    return { deletedFiles: [], preservedFiles: [] };
  }

  const enabled = await isAutoDeleteDiagramsEnabled();
  if (!enabled) {
    return { deletedFiles: [], preservedFiles: imageFilenames };
  }

  const uniqueFiles = [...new Set(imageFilenames.map((f) => path.basename(f)).filter(Boolean))];
  const deletedFiles = [];
  const preservedFiles = [];

  for (const filename of uniqueFiles) {
    // Check if any OTHER active question references this filename
    const otherReferencingCount = await prisma.question.count({
      where: {
        id: excludeQuestionIds.length > 0 ? { notIn: excludeQuestionIds } : undefined,
        OR: [
          { imageFilename: filename },
          { optionAImage: filename },
          { optionBImage: filename },
          { optionCImage: filename },
          { optionDImage: filename },
        ],
      },
    });

    if (otherReferencingCount === 0) {
      // Safe to delete from disk!
      const filePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deletedFiles.push(filename);
        } catch (err) {
          console.error(`Failed to delete diagram file ${filename}:`, err.message);
        }
      }
    } else {
      preservedFiles.push(filename);
    }
  }

  return { deletedFiles, preservedFiles };
}

/**
 * Scans the entire uploads/images folder against the Question table,
 * identifying all orphaned image files (images not referenced by any question).
 */
async function findOrphanedImages() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    return { orphaned: [], usedFilesMap: new Map(), totalFiles: 0 };
  }

  const filesOnDisk = fs.readdirSync(UPLOAD_DIR).filter((f) => {
    const ext = f.split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg'].includes(ext);
  });

  if (filesOnDisk.length === 0) {
    return { orphaned: [], usedFilesMap: new Map(), totalFiles: 0 };
  }

  // Query all non-null image references in Question table
  const allQuestionsWithImages = await prisma.question.findMany({
    where: {
      OR: [
        { imageFilename: { not: null } },
        { optionAImage: { not: null } },
        { optionBImage: { not: null } },
        { optionCImage: { not: null } },
        { optionDImage: { not: null } },
      ],
    },
    select: {
      id: true,
      questionText: true,
      imageFilename: true,
      optionAImage: true,
      optionBImage: true,
      optionCImage: true,
      optionDImage: true,
      chapter: { select: { name: true, subject: { select: { name: true, exam: { select: { name: true } } } } } },
    },
  });

  const usedFilesMap = new Map(); // filename -> array of question summary objects
  for (const q of allQuestionsWithImages) {
    const imgList = extractImageFilenames(q);
    const summary = {
      id: q.id,
      preview: q.questionText ? (q.questionText.length > 80 ? q.questionText.slice(0, 80) + '…' : q.questionText) : 'Question',
      exam: q.chapter?.subject?.exam?.name || 'General',
      subject: q.chapter?.subject?.name || 'General',
      chapter: q.chapter?.name || 'General',
    };
    for (const f of imgList) {
      const clean = path.basename(f);
      if (!usedFilesMap.has(clean)) {
        usedFilesMap.set(clean, []);
      }
      usedFilesMap.get(clean).push(summary);
    }
  }

  const orphaned = [];
  for (const file of filesOnDisk) {
    const clean = path.basename(file);
    if (!usedFilesMap.has(clean) || usedFilesMap.get(clean).length === 0) {
      orphaned.push(clean);
    }
  }

  return { orphaned, usedFilesMap, totalFiles: filesOnDisk.length };
}

module.exports = {
  isAutoDeleteDiagramsEnabled,
  setAutoDeleteDiagramsEnabled,
  extractImageFilenames,
  purgeUnreferencedImages,
  findOrphanedImages,
  UPLOAD_DIR,
};
