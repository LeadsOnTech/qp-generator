const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../lib/auth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });


const router = express.Router();

/**
 * GET /api/questions
 * Query filters: exam, subject, chapter, difficulty, questionType,
 *                verificationLevel, syllabusStatus, search, page, pageSize
 */
router.get('/', async (req, res) => {
  const {
    exam, subject, chapter, topic, difficulty, questionType,
    verificationLevel, syllabusStatus, search,
    page = '1', pageSize = '25',
  } = req.query;

  const where = { isActive: true, workflowState: 'BANK' };

  // An INSTITUTE user sees the shared master bank (AIA-verified questions
  // marked sharedGlobally) plus anything they've uploaded themselves —
  // never another institute's private, non-shared questions.
  if (req.user.role !== 'ADMIN') {
    where.OR = [
      { sharedGlobally: true },
      { ownerInstituteId: req.user.instituteId },
    ];
  }

  if (difficulty) where.difficulty = difficulty;
  if (questionType) where.questionType = questionType;
  if (verificationLevel) where.verificationLevel = verificationLevel;
  if (search) where.questionText = { contains: search };
  if (topic) where.topic = { name: topic };

  const chapterWhere = {};
  if (syllabusStatus) chapterWhere.syllabusStatus = syllabusStatus;
  if (chapter) chapterWhere.name = chapter;

  const subjectWhere = {};
  if (subject) subjectWhere.name = subject;

  if (exam) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { chapter: { subject: { exam: { name: exam } } } },
          { examMappings: { some: { exam: { name: exam }, isActive: true } } },
        ],
      },
    ];
  }

  if (Object.keys(subjectWhere).length || Object.keys(chapterWhere).length) {
    chapterWhere.subject = subjectWhere;
  }
  if (Object.keys(chapterWhere).length) {
    where.chapter = chapterWhere;
  }

  const take = Math.min(parseInt(pageSize, 10) || 25, 200);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        chapter: { include: { subject: { include: { exam: true } } } },
        topic: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    total,
    page: parseInt(page, 10) || 1,
    pageSize: take,
    items: items.map(formatQuestion),
  });
});

/**
 * GET /api/questions/stats — dashboard summary counts
 */
router.get('/stats', async (req, res) => {
  const [total, untagged, removed, byDifficulty] = await Promise.all([
    prisma.question.count({ where: { isActive: true, workflowState: 'BANK' } }),
    prisma.question.count({ where: { isActive: true, workflowState: 'BANK', difficulty: 'UNTAGGED' } }),
    prisma.question.count({ where: { isActive: true, workflowState: 'BANK', chapter: { syllabusStatus: 'REMOVED' } } }),
    prisma.question.groupBy({ by: ['difficulty'], where: { isActive: true, workflowState: 'BANK' }, _count: true }),
  ]);

  res.json({
    total,
    untagged,
    excludedByRemovedSyllabus: removed,
    byDifficulty: byDifficulty.map((d) => ({ difficulty: d.difficulty, count: d._count })),
  });
});

/**
 * GET /api/questions/bank-analytics
 * A single roll-up powering the Question Bank Analytics dashboard. Returns,
 * for the whole active bank: overall totals + difficulty split, a
 * per-chapter table (exam > subject > chapter) with EASY/MEDIUM/HARD/
 * UNTAGGED counts + question-type counts + a total, and a by-year
 * breakdown of PYQs. Computed from one findMany so the dashboard loads in
 * a single request rather than N calls per chapter.
 */
router.get('/bank-analytics', async (req, res) => {
  const questions = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'BANK' },
    select: {
      difficulty: true,
      questionType: true,
      examYear: true,
      checkStatus: true,
      chapter: {
        select: {
          id: true,
          name: true,
          syllabusStatus: true,
          subject: { select: { name: true, exam: { select: { name: true } } } },
        },
      },
    },
  });

  const DIFFS = ['EASY', 'MEDIUM', 'HARD', 'UNTAGGED'];
  const TYPES = ['MCQ', 'ASSERTION_REASON', 'MATCH_FOLLOWING', 'STATEMENT_I_II', 'NUMERICAL', 'DIAGRAM_BASED'];

  const overall = { total: questions.length, EASY: 0, MEDIUM: 0, HARD: 0, UNTAGGED: 0, flagged: 0 };
  const byYear = {};
  const chapterMap = {};

  for (const q of questions) {
    const diff = DIFFS.includes(q.difficulty) ? q.difficulty : 'UNTAGGED';
    const type = TYPES.includes(q.questionType) ? q.questionType : 'MCQ';
    overall[diff] += 1;
    if (q.checkStatus === 'FLAGGED') overall.flagged += 1;

    const yearKey = q.examYear ? String(q.examYear) : 'Unspecified';
    byYear[yearKey] = (byYear[yearKey] || 0) + 1;

    const ch = q.chapter;
    if (!ch) continue;
    if (!chapterMap[ch.id]) {
      chapterMap[ch.id] = {
        chapterId: ch.id,
        chapter: ch.name,
        subject: ch.subject?.name || '—',
        exam: ch.subject?.exam?.name || '—',
        syllabusStatus: ch.syllabusStatus,
        total: 0,
        EASY: 0, MEDIUM: 0, HARD: 0, UNTAGGED: 0,
        types: Object.fromEntries(TYPES.map((t) => [t, 0])),
      };
    }
    const row = chapterMap[ch.id];
    row.total += 1;
    row[diff] += 1;
    row.types[type] += 1;
  }

  const chapters = Object.values(chapterMap).sort((a, b) =>
    a.exam.localeCompare(b.exam) || a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter)
  );

  // Coverage flags: chapters thin in some difficulty (has questions but
  // under 15), or missing a difficulty entirely — so you know where to
  // upload more. Only warns on chapters that already have some questions.
  const coverageWarnings = [];
  for (const c of chapters) {
    if (c.total === 0) continue;
    const gaps = [];
    for (const d of ['EASY', 'MEDIUM', 'HARD']) {
      if (c[d] === 0) gaps.push(`no ${d.toLowerCase()}`);
      else if (c[d] < 15) gaps.push(`${d.toLowerCase()}: ${c[d]}`);
    }
    if (gaps.length) coverageWarnings.push({ exam: c.exam, subject: c.subject, chapter: c.chapter, gaps });
  }

  const byYearSorted = Object.entries(byYear)
    .sort((a, b) => {
      if (a[0] === 'Unspecified') return 1;
      if (b[0] === 'Unspecified') return -1;
      return Number(b[0]) - Number(a[0]);
    })
    .map(([year, count]) => ({ year, count }));

  res.json({ overall, chapters, byYear: byYearSorted, coverageWarnings, generatedAt: new Date().toISOString() });
});

/**
 * PATCH /api/questions/:id — used for the bulk difficulty review step (Phase 2 groundwork)
 * and for correcting a question (edit text/options/answer directly).
 */
router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption', 'solutionText',
    'difficulty', 'difficultySource', 'questionType', 'isActive', 'sharedGlobally', 'imageFilename',
  ];
  const data = {};
  for (const field of allowedFields) {
    if (field in req.body) data[field] = req.body[field];
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update.' });
  }
  try {
    const updated = await prisma.question.update({ where: { id }, data });
    res.json(formatQuestion(updated));
  } catch (err) {
    res.status(404).json({ error: 'Question not found.' });
  }
});

/**
 * DELETE /api/questions/:id — soft delete (keeps audit trail, never hard-deletes)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const q = await prisma.question.findUnique({ where: { id: req.params.id }, include: { papers: true } });
    if (q && q.papers && q.papers.length > 0) {
      return res.status(400).json({ error: 'Cannot delete question: it is already used in one or more generated papers.' });
    }
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: 'Question not found.' });
  }
});

/**
 * Builds the Prisma `where` clause for a bulk scope.
 * Scope must name at least an exam + subject + chapter, so it is never
 * possible to accidentally wipe the entire bank with an empty filter.
 */
function buildBulkScope({ exam, subject, chapter, topic, difficulty }) {
  if (!exam || !subject || !chapter) {
    return { error: 'A bulk action needs at least Exam, Subject and Chapter — this prevents accidentally removing the whole question bank.' };
  }
  const where = {
    isActive: true,
    chapter: {
      name: chapter,
      subject: { name: subject, exam: { name: exam } },
    },
  };
  if (topic) where.topic = { name: topic };
  if (difficulty) where.difficulty = difficulty;
  return { where };
}

/**
 * POST /api/questions/bulk/preview
 * Body: { exam, subject, chapter, topic?, difficulty? }
 * Returns how many questions a bulk remove WOULD affect, plus a small
 * sample of them. Nothing is changed — this exists so the admin always
 * sees the blast radius before confirming a destructive action.
 */
router.post('/bulk/preview', requireAdmin, async (req, res) => {
  const { where, error } = buildBulkScope(req.body);
  if (error) return res.status(400).json({ error });

  const [count, sample] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      take: 5,
      select: { id: true, questionText: true, difficulty: true },
    }),
  ]);

  res.json({
    count,
    sample: sample.map((q) => ({
      id: q.id,
      preview: q.questionText.length > 110 ? q.questionText.slice(0, 110) + '…' : q.questionText,
      difficulty: q.difficulty,
    })),
  });
});

/**
 * POST /api/questions/bulk/remove
 * Body: { exam, subject, chapter, topic?, difficulty?, confirmCount }
 *
 * Soft-removes every question matching the scope (isActive: false), the
 * same reversible mechanism single-question delete already uses — so a
 * mistake here can be undone rather than losing work permanently.
 *
 * `confirmCount` must match the number the preview reported. If the bank
 * changed in between (another upload, another admin), the counts differ
 * and the request is rejected rather than removing more than intended.
 */
router.post('/bulk/remove', requireAdmin, async (req, res) => {
  const { where, error } = buildBulkScope(req.body);
  if (error) return res.status(400).json({ error });

  const { confirmCount } = req.body;
  const actual = await prisma.question.count({ where });

  if (typeof confirmCount !== 'number') {
    return res.status(400).json({ error: 'confirmCount is required — run the preview first.' });
  }
  if (confirmCount !== actual) {
    return res.status(409).json({
      error: `The bank changed since you previewed (expected ${confirmCount} questions, found ${actual}). Please preview again before removing.`,
      actual,
    });
  }
  if (actual === 0) {
    return res.json({ ok: true, removed: 0 });
  }

  const result = await prisma.question.updateMany({ where, data: { isActive: false } });
  res.json({ ok: true, removed: result.count });
});

/**
 * POST /api/questions/bulk/restore
 * Body: { exam, subject, chapter, topic?, difficulty? }
 * Undoes a bulk remove. Because removal is a soft delete, everything can
 * be brought back — this is the safety net that makes bulk removal a
 * reasonable thing to offer at all.
 */
router.post('/bulk/restore', requireAdmin, async (req, res) => {
  const { where, error } = buildBulkScope(req.body);
  if (error) return res.status(400).json({ error });

  // Look for the removed ones instead of the active ones.
  const restoreWhere = { ...where, isActive: false };
  const result = await prisma.question.updateMany({ where: restoreWhere, data: { isActive: true } });
  res.json({ ok: true, restored: result.count });
});

function formatQuestion(q) {
  return {
    id: q.id,
    questionText: q.questionText,
    options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
    optionImages: {
      A: q.optionAImage || null,
      B: q.optionBImage || null,
      C: q.optionCImage || null,
      D: q.optionDImage || null,
    },
    optionImageUrls: {
      A: q.optionAImage ? `/uploads/images/${q.optionAImage}` : null,
      B: q.optionBImage ? `/uploads/images/${q.optionBImage}` : null,
      C: q.optionCImage ? `/uploads/images/${q.optionCImage}` : null,
      D: q.optionDImage ? `/uploads/images/${q.optionDImage}` : null,
    },
    correctOption: q.correctOption,
    questionType: q.questionType,
    difficulty: q.difficulty,
    difficultySource: q.difficultySource,
    verificationLevel: q.verificationLevel,
    sharedGlobally: q.sharedGlobally,
    timesUsed: q.timesUsed,
    imageFilename: q.imageFilename || null,
    imageUrl: q.imageFilename ? `/uploads/images/${q.imageFilename}` : null,
    exam: q.chapter?.subject?.exam?.name,
    subject: q.chapter?.subject?.name,
    chapter: q.chapter?.name,
    syllabusStatus: q.chapter?.syllabusStatus,
    topic: q.topic?.name || null,
    createdAt: q.createdAt,
  };
}

const { buildPaperPdf } = require('../lib/pdfBuilder');

/**
 * GET /api/questions/batch/:batchId/preview
 * Streams a PDF of the newly uploaded questions so the admin can visually inspect them.
 */
router.get('/batch/:batchId/preview', requireAuth, async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      where: { uploadBatchId: req.params.batchId, isActive: true },
      include: { chapter: { include: { subject: { include: { exam: true } } } } },
      orderBy: { id: 'asc' },
    });

    if (questions.length === 0) {
      return res.status(404).send('No questions found for this upload batch.');
    }

    const batch = await prisma.uploadBatch.findUnique({ where: { id: req.params.batchId } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview-${req.params.batchId}.pdf"`);

    const paper = {
      title: batch ? `Preview: ${batch.fileName.replace(/\.xlsx?$|\.csv$/i, '')}` : 'Batch Upload Preview',
      instituteName: 'QuestionStudio',
      examName: questions[0]?.chapter?.subject?.exam?.name || 'Question Bank',
      paperType: 'PREVIEW'
    };

    const formattedQuestions = questions.map(formatQuestion);

    buildPaperPdf(res, paper, formattedQuestions, false);
  } catch (err) {
    res.status(500).json({ error: 'Error generating preview: ' + err.message });
  }
});

/**
 * POST /api/questions/batch/:batchId/submit-qc
 * Moves the batch from DRAFT into the IN_QC queue.
 */
router.post('/batch/:batchId/submit-qc', requireAuth, async (req, res) => {
  await prisma.question.updateMany({
    where: { uploadBatchId: req.params.batchId, workflowState: 'DRAFT' },
    data: { workflowState: 'IN_QC' }
  });
  res.json({ ok: true });
});


/**
 * POST /api/questions/search-image
 */
router.post('/search-image', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  let extractedText = '';
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    const base64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;

    if (ANTHROPIC_API_KEY) {
      const payload = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text', text: 'Extract the text and mathematical formulas from this question screenshot. Format math using LaTeX. Return only the extracted text, no other commentary. DO NOT use markdown like **.' }
          ]
        }]
      };
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (data.content && data.content[0]) {
        extractedText = data.content[0].text;
      }
    } else if (GEMINI_API_KEY) {
      const payload = {
        contents: [{
          parts: [
            { inline_data: { mime_type: mime, data: base64 } },
            { text: 'Extract the text and mathematical formulas from this question screenshot. Format math using LaTeX. Return only the extracted text, no other commentary. DO NOT use markdown like **.' }
          ]
        }]
      };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (data.candidates && data.candidates[0]) {
        extractedText = data.candidates[0].content.parts[0].text;
      }
    } else {
      return res.status(400).json({ error: 'Please add GEMINI_API_KEY or ANTHROPIC_API_KEY to backend/.env to use Search by Screenshot.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'AI Extraction failed: ' + err.message });
  }

  // Find matches using Jaccard similarity on bigrams
  const allQs = await prisma.question.findMany({
    where: { isActive: true },
    select: { id: true, questionText: true, optionA: true, optionB: true, optionC: true, optionD: true, solutionText: true, chapter: { include: { subject: true } } }
  });

  function getBigrams(str) {
    const s = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = new Set();
    for(let i=0; i<s.length-1; i++) b.add(s.slice(i, i+2));
    return b;
  }
  const extBigrams = getBigrams(extractedText);
  if (extBigrams.size === 0) return res.json({ extractedText, matches: [] });

  const scored = allQs.map(q => {
    const combined = [q.questionText, q.optionA, q.optionB, q.optionC, q.optionD].join(' ');
    const qb = getBigrams(combined);
    let intersection = 0;
    for (let bg of extBigrams) if (qb.has(bg)) intersection++;
    const union = extBigrams.size + qb.size - intersection;
    const score = union === 0 ? 0 : intersection / union;
    return { ...q, matchScore: Math.round(score * 100) };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const topMatches = scored.slice(0, 5).filter(q => q.matchScore >= 5); // threshold

  res.json({ extractedText, matches: topMatches });
});


module.exports = router;
