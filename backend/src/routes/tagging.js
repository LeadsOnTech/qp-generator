const express = require('express');
const prisma = require('../db');
const { tagQuestions } = require('../lib/aiTagger');

const router = express.Router();

/**
 * POST /api/tagging/run
 * Finds all UNTAGGED active questions with no pending suggestion,
 * runs the tagging engine, and stores suggestions with reviewStatus PENDING.
 * The real difficulty field is NOT touched — only Accept/Override changes it.
 */
router.post('/run', async (req, res) => {
  const untagged = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'BANK', difficulty: 'UNTAGGED', reviewStatus: null },
    include: { chapter: { include: { subject: true } } },
    take: 500, // safety cap per run — re-run for more
  });

  if (untagged.length === 0) {
    return res.json({ tagged: 0, engine: null, message: 'No untagged questions waiting.' });
  }

  const inputs = untagged.map((q) => ({
    questionText: q.questionText,
    optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
    questionType: q.questionType,
    subject: q.chapter?.subject?.name,
    chapter: q.chapter?.name,
  }));

  const results = await tagQuestions(inputs);

  for (let i = 0; i < untagged.length; i++) {
    await prisma.question.update({
      where: { id: untagged[i].id },
      data: {
        aiSuggestedDifficulty: results[i].difficulty,
        aiConfidence: results[i].confidence,
        aiRationale: results[i].rationale,
        aiEngine: results[i].engine,
        reviewStatus: 'PENDING',
      },
    });
  }

  const engines = [...new Set(results.map((r) => r.engine))];
  res.json({
    tagged: untagged.length,
    engine: engines.join(' + '),
    message: engines.includes('CLAUDE')
      ? `${untagged.length} questions tagged by Claude AI — review below.`
      : `${untagged.length} questions tagged by the built-in rule engine (no ANTHROPIC_API_KEY set) — review below.`,
  });
});

/**
 * GET /api/tagging/review — the pending review queue
 */
router.get('/review', async (req, res) => {
  const { page = '1', pageSize = '25' } = req.query;
  const take = Math.min(parseInt(pageSize, 10) || 25, 200);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = { isActive: true, reviewStatus: 'PENDING' };
  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { chapter: { include: { subject: { include: { exam: true } } } } },
      orderBy: [{ aiConfidence: 'asc' }], // lowest-confidence first — where human eyes matter most
      take, skip,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    total,
    page: parseInt(page, 10) || 1,
    pageSize: take,
    items: items.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
      correctOption: q.correctOption,
      questionType: q.questionType,
      exam: q.chapter?.subject?.exam?.name,
      subject: q.chapter?.subject?.name,
      chapter: q.chapter?.name,
      aiSuggestedDifficulty: q.aiSuggestedDifficulty,
      aiConfidence: q.aiConfidence,
      aiRationale: q.aiRationale,
      aiEngine: q.aiEngine,
    })),
  });
});

/**
 * POST /api/tagging/review/:id
 * Body: { action: "accept" } or { action: "override", difficulty: "EASY"|"MEDIUM"|"HARD" }
 */
router.post('/review/:id', async (req, res) => {
  const { action, difficulty } = req.body;
  const q = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!q || q.reviewStatus !== 'PENDING') {
    return res.status(404).json({ error: 'No pending suggestion found for this question.' });
  }

  if (action === 'accept') {
    await prisma.question.update({
      where: { id: q.id },
      data: {
        difficulty: q.aiSuggestedDifficulty,
        difficultySource: q.aiEngine === 'CLAUDE' ? 'AI_SUGGESTED' : 'AI_SUGGESTED',
        reviewStatus: 'ACCEPTED',
      },
    });
    return res.json({ ok: true, difficulty: q.aiSuggestedDifficulty });
  }

  if (action === 'override') {
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      return res.status(400).json({ error: 'difficulty must be EASY, MEDIUM, or HARD for override.' });
    }
    await prisma.question.update({
      where: { id: q.id },
      data: { difficulty, difficultySource: 'HUMAN_REVIEWED', reviewStatus: 'OVERRIDDEN' },
    });
    return res.json({ ok: true, difficulty });
  }

  res.status(400).json({ error: 'action must be "accept" or "override".' });
});

/**
 * POST /api/tagging/accept-all
 * Accepts every pending suggestion in one shot (for high-trust batches).
 */
router.post('/accept-all', async (req, res) => {
  const pending = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'BANK', reviewStatus: 'PENDING', aiSuggestedDifficulty: { not: null } },
    select: { id: true, aiSuggestedDifficulty: true },
  });

  for (const q of pending) {
    await prisma.question.update({
      where: { id: q.id },
      data: { difficulty: q.aiSuggestedDifficulty, difficultySource: 'AI_SUGGESTED', reviewStatus: 'ACCEPTED' },
    });
  }

  res.json({ accepted: pending.length });
});

module.exports = router;
