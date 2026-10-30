const express = require('express');
const multer = require('multer');
const prisma = require('../db');
const { requireAdmin } = require('../lib/auth');
const { parseSpreadsheet, normalizeExamName } = require('../lib/extract');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * GET /api/syllabus/tree — full Exam -> Subject -> Chapter (with question counts)
 * This powers the Syllabus Master screen where the academic team marks
 * chapters ACTIVE / REMOVED / MODIFIED.
 */
router.get('/tree', async (req, res) => {
  const { examName } = req.query;
  const where = {};
  if (examName) where.name = examName;

  const exams = await prisma.exam.findMany({
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
  });

  let typeCounts = [];
  try {
    typeCounts = await prisma.question.findMany({
      where: { isActive: true, workflowState: 'BANK' },
      select: {
        id: true,
        chapterId: true,
        questionType: true,
        chapter: { select: { name: true, subject: { select: { name: true } } } },
        examMappings: { select: { examId: true } },
      },
    });
  } catch (e) {
    typeCounts = await prisma.question.findMany({
      where: { isActive: true, workflowState: 'BANK' },
      select: {
        id: true,
        chapterId: true,
        questionType: true,
        chapter: { select: { name: true, subject: { select: { name: true } } } },
      },
    });
  }

  function getCountsForChapter(examId, subjectName, chapterName, chapterId) {
    let mcq = 0;
    let nvq = 0;
    const targetC = chapterName?.toLowerCase().trim();
    const targetS = subjectName?.toLowerCase().trim();

    for (const q of typeCounts) {
      const isDirect = q.chapterId === chapterId;
      const qC = q.chapter?.name?.toLowerCase().trim();
      const qS = q.chapter?.subject?.name?.toLowerCase().trim();
      const isMapped = q.examMappings?.some((m) => m.examId === examId) &&
                       qC === targetC &&
                       qS === targetS;
      if (isDirect || isMapped) {
        const qType = q.questionType;
        if (qType === 'NVQ' || qType === 'NUMERICAL' || qType === 'DECIMAL' || qType === 'NVT') {
          nvq++;
        } else {
          mcq++;
        }
      }
    }
    return { mcq, nvq, total: mcq + nvq };
  }

  res.json(exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    subjects: exam.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      chapters: s.chapters.map((c) => {
        const counts = getCountsForChapter(exam.id, s.name, c.name, c.id);
        return {
          id: c.id,
          name: c.name,
          syllabusStatus: c.syllabusStatus,
          statusNote: c.statusNote,
          statusYear: c.statusYear,
          questionCount: counts.total,
          mcqCount: counts.mcq,
          nvqCount: counts.nvq,
          topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
        };
      }),
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
 * POST /api/syllabus/import
 * Bulk imports or updates syllabus chapters from an Excel or CSV file.
 * Columns: Exam, Subject, Chapter, Status (optional), Note (optional)
 */
router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Attach an .xlsx, .xls, or .csv file.' });

  let rows;
  try {
    const parsed = parseSpreadsheet(req.file.buffer);
    rows = parsed.rows;
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse spreadsheet: ' + err.message });
  }

  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'The file appears to be empty (no rows found).' });
  }

  let imported = 0;
  for (const r of rows) {
    const rawExam = (r.exam || r.examname || '').trim();
    const examName = normalizeExamName(rawExam);
    const subjectName = (r.subject || r.subjectname || '').trim();
    const chapterName = (r.chapter || r.chaptername || '').trim();
    const rawStatus = (r.status || r.syllabusstatus || 'ACTIVE').trim().toUpperCase();
    const syllabusStatus = ['ACTIVE', 'REMOVED', 'MODIFIED'].includes(rawStatus) ? rawStatus : 'ACTIVE';
    const statusNote = (r.note || r.statusnote || '').trim() || null;

    if (!examName || !subjectName || !chapterName) continue;

    const exam = await prisma.exam.upsert({
      where: { name: examName },
      update: {},
      create: { name: examName },
    });

    const subject = await prisma.subject.upsert({
      where: { name_examId: { name: subjectName, examId: exam.id } },
      update: {},
      create: { name: subjectName, examId: exam.id },
    });

    await prisma.chapter.upsert({
      where: { name_subjectId: { name: chapterName, subjectId: subject.id } },
      update: { syllabusStatus, statusNote },
      create: { name: chapterName, subjectId: subject.id, syllabusStatus, statusNote },
    });

    imported++;
  }

  res.json({ ok: true, imported, message: `Successfully imported ${imported} syllabus chapters!` });
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
