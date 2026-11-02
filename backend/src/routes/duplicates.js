const express = require('express');
const prisma = require('../db');

const router = express.Router();

/**
 * Normalizes text so minor cosmetic differences (case, punctuation, spacing)
 * don't hide duplicate questions.
 */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes a smart composite key for duplicate detection.
 * Questions are considered duplicates ONLY when ALL of the following match:
 * 1. Same Chapter (questions in different chapters are never duplicates)
 * 2. Same normalized Question Text
 * 3. Same Diagram Image (questions with different diagrams are distinct questions)
 * 4. Same Options (A-D) text (order-independent)
 * 5. Same Option Images (A-D)
 */
function getQuestionDuplicateKey(q) {
  // 1. Chapter scoping: questions in different chapters can never be duplicates
  const chapterKey = q.chapterId || (q.chapter ? q.chapter.id || q.chapter.name : '__NO_CHAPTER__');

  // 2. Question text
  const textKey = normalize(q.questionText);

  // 3. Diagram image
  const imageKey = q.imageFilename ? String(q.imageFilename).trim().toLowerCase() : '__NO_IMG__';

  // 4. Options text (sorted so identical options match regardless of letter permutation)
  const optionsKey = [q.optionA, q.optionB, q.optionC, q.optionD]
    .map((o) => normalize(o))
    .sort()
    .join('###');

  // 5. Option diagram images
  const optImagesKey = [q.optionAImage, q.optionBImage, q.optionCImage, q.optionDImage]
    .map((img) => (img ? String(img).trim().toLowerCase() : ''))
    .join('|');

  // Edge-case safeguard: if question has neither text nor image, skip grouping
  if (!textKey && imageKey === '__NO_IMG__') return null;

  return `${chapterKey}:::${textKey}:::${imageKey}:::${optionsKey}:::${optImagesKey}`;
}

/**
 * GET /api/duplicates
 * Groups active questions that have an exact matching composite signature.
 * Only groups with 2+ copies are returned.
 */
router.get('/', async (req, res) => {
  const questions = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'BANK' },
    include: { chapter: { include: { subject: { include: { exam: true } } } } },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map();
  for (const q of questions) {
    const key = getQuestionDuplicateKey(q);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }

  const duplicateGroups = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) =>
      g.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        imageFilename: q.imageFilename || null,
        imageUrl: q.imageFilename ? `/uploads/images/${q.imageFilename}` : null,
        optionA: q.optionA || '',
        optionB: q.optionB || '',
        optionC: q.optionC || '',
        optionD: q.optionD || '',
        optionAImage: q.optionAImage || null,
        optionBImage: q.optionBImage || null,
        optionCImage: q.optionCImage || null,
        optionDImage: q.optionDImage || null,
        correctOption: q.correctOption || '',
        exam: q.chapter?.subject?.exam?.name || '—',
        subject: q.chapter?.subject?.name || '—',
        chapter: q.chapter?.name || '—',
        difficulty: q.difficulty || 'UNTAGGED',
        sourceFileName: q.sourceFileName,
        sourceRow: q.sourceRow,
        createdAt: q.createdAt,
      }))
    );

  res.json({
    groupCount: duplicateGroups.length,
    totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0),
    groups: duplicateGroups,
  });
});

/**
 * POST /api/duplicates/bulk-remove
 * Finds all duplicates and marks all except the oldest one in each group as isActive: false.
 */
router.post('/bulk-remove', async (req, res) => {
  const questions = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'BANK' },
    include: { chapter: { include: { subject: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map();
  for (const q of questions) {
    const key = getQuestionDuplicateKey(q);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }

  const idsToRemove = [];
  for (const g of groups.values()) {
    if (g.length > 1) {
      // The first element is the oldest because of orderBy: { createdAt: 'asc' }
      // We keep the first one (index 0) and remove the rest (index 1 to end).
      for (let i = 1; i < g.length; i++) {
        idsToRemove.push(g[i].id);
      }
    }
  }

  if (idsToRemove.length > 0) {
    await prisma.question.updateMany({
      where: { id: { in: idsToRemove } },
      data: { isActive: false },
    });
  }

  res.json({ ok: true, removedCount: idsToRemove.length });
});

/**
 * POST /api/duplicates/remove-ids
 * Soft-deletes a specific list of duplicate question IDs.
 */
router.post('/remove-ids', async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  await prisma.question.updateMany({
    where: { id: { in: ids } },
    data: { isActive: false },
  });

  res.json({ ok: true, removedCount: ids.length });
});

module.exports = router;
