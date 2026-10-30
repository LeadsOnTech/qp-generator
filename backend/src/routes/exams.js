const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');

const router = express.Router();

/**
 * GET /api/exams
 * One card's worth of summary data per exam — total active questions,
 * how many subjects/chapters it has, and how many papers have been
 * generated for it. This is what powers the Exam Hub landing screen,
 * keeping NEET/JEE/EAMCET data visibly separate from the first click.
 */
router.get('/', async (req, res) => {
  const exams = await prisma.exam.findMany({
    include: {
      subjects: {
        include: { chapters: { include: { _count: { select: { questions: { where: { isActive: true, workflowState: 'BANK' } } } } } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const results = [];
  for (const exam of exams) {
    let totalQuestions = 0;
    try {
      totalQuestions = await prisma.question.count({
        where: {
          isActive: true,
          workflowState: 'BANK',
          OR: [
            { chapter: { subject: { examId: exam.id } } },
            { examMappings: { some: { examId: exam.id, isActive: true } } },
          ],
        },
      });
    } catch (e) {
      totalQuestions = exam.subjects.reduce(
        (sum, s) => sum + s.chapters.reduce((cSum, c) => cSum + c._count.questions, 0),
        0
      );
    }

    const paperCountWhere = req.user?.role === 'ADMIN'
      ? { examName: exam.name }
      : { examName: exam.name, instituteId: req.user?.instituteId };
    const paperCount = await prisma.paper.count({ where: paperCountWhere }).catch(() => 0);

    results.push({
      id: exam.id,
      name: exam.name,
      subjectCount: exam.subjects.length,
      chapterCount: exam.subjects.reduce((sum, s) => sum + s.chapters.length, 0),
      totalQuestions,
      paperCount,
      hasSavedPattern: Boolean(exam.patternSubjects),
    });
  }

  res.json(results);
});

/**
 * GET /api/exams/:name/pattern
 * Returns the saved subject-count / difficulty-mix blueprint for this exam,
 * or null if nothing has been saved yet.
 */
router.get('/:name/pattern', async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { name: req.params.name } });
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  res.json({
    subjects: exam.patternSubjects ? JSON.parse(exam.patternSubjects) : null,
    difficultyMix: exam.patternDifficultyMix ? JSON.parse(exam.patternDifficultyMix) : null,
    paperType: exam.patternPaperType || null,
  });
});

/**
 * PUT /api/exams/:name/pattern
 * Body: { subjects: [{name, count}], difficultyMix: {easy,medium,hard}, paperType? }
 * Saves this as the reusable blueprint for the exam — the next time someone
 * generates a paper for this exam, these become the starting defaults.
 */
router.put('/:name/pattern', requireAdmin, async (req, res) => {
  const { subjects, difficultyMix, paperType } = req.body;
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'subjects must be a non-empty array of {name, count}.' });
  }
  if (!difficultyMix || typeof difficultyMix !== 'object') {
    return res.status(400).json({ error: 'difficultyMix is required, e.g. {easy:40,medium:40,hard:20}.' });
  }

  try {
    const exam = await prisma.exam.update({
      where: { name: req.params.name },
      data: {
        patternSubjects: JSON.stringify(subjects),
        patternDifficultyMix: JSON.stringify(difficultyMix),
        patternPaperType: paperType || null,
      },
    });
    res.json({ ok: true, examId: exam.id });
  } catch (err) {
    res.status(404).json({ error: 'Exam not found.' });
  }
});


/**
 * DELETE /api/exams/:id
 * Hard deletes an exam and EVERYTHING associated with it (Questions, Papers, Subjects, Chapters).
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // 1. Delete all PaperQuestions and Papers related to this exam
    const papers = await prisma.paper.findMany({ where: { examName: exam.name }, select: { id: true } });
    const paperIds = papers.map(p => p.id);
    if (paperIds.length > 0) {
      await prisma.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } });
      await prisma.paper.deleteMany({ where: { id: { in: paperIds } } });
    }

    // 2. Find all subjects, chapters, questions
    const subjects = await prisma.subject.findMany({ where: { examId: id }, select: { id: true } });
    const subjectIds = subjects.map(s => s.id);

    if (subjectIds.length > 0) {
      const chapters = await prisma.chapter.findMany({ where: { subjectId: { in: subjectIds } }, select: { id: true } });
      const chapterIds = chapters.map(c => c.id);

      if (chapterIds.length > 0) {
        // Questions and Topics
        await prisma.paperQuestion.deleteMany({ where: { question: { chapterId: { in: chapterIds } } } }); // just in case
        await prisma.question.deleteMany({ where: { chapterId: { in: chapterIds } } });
        await prisma.topic.deleteMany({ where: { chapterId: { in: chapterIds } } });
        await prisma.chapter.deleteMany({ where: { id: { in: chapterIds } } });
      }
      await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
    }

    // 3. Delete Exam
    await prisma.exam.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
