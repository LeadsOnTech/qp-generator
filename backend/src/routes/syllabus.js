const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');

const router = express.Router();

/**
 * GET /api/syllabus/tree — full Exam -> Subject -> Chapter (with question counts)
 * This powers the Syllabus Master screen where the academic team marks
 * chapters ACTIVE / REMOVED / MODIFIED.
 */
router.get('/tree', async (req, res) => {
  const { examName } = req.query;
  const where = {};
  if (examName) where.name = examName;

  const [exams, typeCounts] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: {
        subjects: {
          include: {
            chapters: {
              include: {
                _count: { 
                  select: { 
                    questions: {
                      where: { isActive: true, workflowState: 'BANK' }
                    } 
                  } 
                },
                topics: true,
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.question.groupBy({
      by: ['chapterId', 'questionType'],
      _count: true,
      where: { isActive: true, workflowState: 'BANK' }
    })
  ]);

  // Build a lookup map: chapterId -> { mcq: X, nvq: Y }
  const countsMap = {};
  for (const group of typeCounts) {
    if (!countsMap[group.chapterId]) countsMap[group.chapterId] = { mcq: 0, nvq: 0 };
    const qType = group.questionType;
    if (qType === 'NVQ' || qType === 'NUMERICAL' || qType === 'DECIMAL' || qType === 'NVT') {
      countsMap[group.chapterId].nvq += group._count;
    } else {
      // Treat everything else as MCQ
      countsMap[group.chapterId].mcq += group._count;
    }
  }

  res.json(exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    subjects: exam.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      chapters: s.chapters.map((c) => ({
        id: c.id,
        name: c.name,
        syllabusStatus: c.syllabusStatus,
        statusNote: c.statusNote,
        statusYear: c.statusYear,
        questionCount: c._count.questions,
        mcqCount: countsMap[c.id]?.mcq || 0,
        nvqCount: countsMap[c.id]?.nvq || 0,
        topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
      })),
    })),
  })));
});

/**
 * PATCH /api/syllabus/chapter/:id
 * Body: { syllabusStatus: "ACTIVE" | "REMOVED" | "MODIFIED", statusNote?, statusYear? }
 *
 * This is the single control point for the "auto-remove deleted syllabus
 * questions" feature — flip one chapter to REMOVED and every question
 * under it is instantly excluded from paper generation, no re-tagging needed.
 */
router.patch('/chapter/:id', requireAdmin, async (req, res) => {
  const { syllabusStatus, statusNote, statusYear } = req.body;
  const valid = ['ACTIVE', 'REMOVED', 'MODIFIED'];
  if (!valid.includes(syllabusStatus)) {
    return res.status(400).json({ error: `syllabusStatus must be one of: ${valid.join(', ')}` });
  }
  try {
    const chapter = await prisma.chapter.update({
      where: { id: req.params.id },
      data: { syllabusStatus, statusNote: statusNote || null, statusYear: statusYear || null },
    });
    res.json(chapter);
  } catch (err) {
    res.status(404).json({ error: 'Chapter not found.' });
  }
});

/**
 * GET /api/syllabus/analytics?chapterId=xxx
 * Breaks down a chapter's ACTIVE questions by difficulty x question type,
 * so a college can see, before generating a paper, whether the bank
 * actually has enough (e.g.) Hard Numerical questions in this chapter.
 */
router.get('/analytics', async (req, res) => {
  const { chapterId } = req.query;
  if (!chapterId) return res.status(400).json({ error: 'chapterId is required.' });

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { subject: { include: { exam: true } } },
  });
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' });

  const questions = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'BANK', chapterId },
    select: { difficulty: true, questionType: true, checkStatus: true },
  });

  const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'UNTAGGED'];
  const TYPES = ['MCQ', 'ASSERTION_REASON', 'MATCH_FOLLOWING', 'STATEMENT_I_II', 'NUMERICAL', 'DIAGRAM_BASED'];

  const grid = {};
  for (const type of TYPES) {
    grid[type] = {};
    for (const diff of DIFFICULTIES) grid[type][diff] = 0;
  }

  let flaggedCount = 0;
  for (const q of questions) {
    const type = TYPES.includes(q.questionType) ? q.questionType : 'MCQ';
    const diff = DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'UNTAGGED';
    grid[type][diff] += 1;
    if (q.checkStatus === 'FLAGGED') flaggedCount++;
  }

  res.json({
    chapter: { id: chapter.id, name: chapter.name, syllabusStatus: chapter.syllabusStatus },
    subject: chapter.subject.name,
    exam: chapter.subject.exam.name,
    total: questions.length,
    flaggedCount,
    grid,
  });
});

module.exports = router;
