const express = require('express');
const prisma = require('../db');

const router = express.Router();

// Normalizes question text so cosmetic differences (case, punctuation,
// double spaces) don't hide a duplicate. This is a code-based check —
// deterministic and free, exactly as planned for duplicate detection.
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // keep letters/numbers (any language), collapse the rest
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * GET /api/duplicates
 * Groups active questions whose normalized question text is identical.
 * Only groups with 2+ members are returned.
 */
router.get('/', async (req, res) => {
  const questions = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'BANK' },
    include: { chapter: { include: { subject: { include: { exam: true } } } } },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map();
  for (const q of questions) {
    const key = normalize(q.questionText);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }

  const duplicateGroups = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => g.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      exam: q.chapter?.subject?.exam?.name,
      subject: q.chapter?.subject?.name,
      chapter: q.chapter?.name,
      difficulty: q.difficulty,
      sourceFileName: q.sourceFileName,
      sourceRow: q.sourceRow,
      createdAt: q.createdAt,
    })));

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
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map();
  for (const q of questions) {
    const key = normalize(q.questionText);
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

module.exports = router;
