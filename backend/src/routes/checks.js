const express = require('express');
const prisma = require('../db');
const { runChecks } = require('../lib/checkEngine');

const router = express.Router();

/**
 * POST /api/checks/run
 * Runs the subject-specialist checkers on every question that hasn't been
 * checked yet (checkStatus is null). Stores PASSED/FLAGGED + issues.
 * A question keeps its existing difficulty/bank status either way — being
 * FLAGGED only affects whether it's eligible for paper generation.
 */
router.post('/run', async (req, res) => {
  const unchecked = await prisma.question.findMany({
    where: { isActive: true, workflowState: 'IN_QC', checkStatus: null },
    include: { chapter: { include: { subject: true } } },
    take: 500,
  });

  if (unchecked.length === 0) {
    return res.json({ checked: 0, engine: null, message: 'Every active question has already been checked.' });
  }

  const inputs = unchecked.map((q) => ({
    questionText: q.questionText,
    options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
    correctOption: q.correctOption,
    questionType: q.questionType,
    subject: q.chapter?.subject?.name,
    chapter: q.chapter?.name,
  }));

  const results = await runChecks(inputs);

  for (let i = 0; i < unchecked.length; i++) {
    await prisma.question.update({
      where: { id: unchecked[i].id },
      data: {
        checkStatus: results[i].status,
        checkIssues: results[i].issues.length ? JSON.stringify(results[i].issues) : null,
        checkEngine: results[i].engine,
        checkedAt: new Date(),
        workflowState: results[i].status === 'PASSED' ? 'BANK' : 'IN_QC',
      },
    });
  }

  const flaggedCount = results.filter((r) => r.status === 'FLAGGED').length;
  const engines = [...new Set(results.map((r) => r.engine))];

  res.json({
    checked: unchecked.length,
    flagged: flaggedCount,
    passed: unchecked.length - flaggedCount,
    engine: engines.join(' + '),
    message: engines.includes('CLAUDE')
      ? `${unchecked.length} questions checked by Claude AI specialists — ${flaggedCount} flagged for review.`
      : `${unchecked.length} questions checked by the built-in rule engine (no ANTHROPIC_API_KEY set) — ${flaggedCount} flagged for review.`,
  });
});

/**
 * GET /api/checks/review — the flagged-question queue
 */
router.get('/review', async (req, res) => {
  const { page = '1', pageSize = '25', subject } = req.query;
  const take = Math.min(parseInt(pageSize, 10) || 25, 200);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = { isActive: true, workflowState: 'IN_QC', checkStatus: 'FLAGGED' };
  if (subject) where.chapter = { subject: { name: subject } };

  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { chapter: { include: { subject: { include: { exam: true } } } } },
      orderBy: { checkedAt: 'desc' },
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
      issues: q.checkIssues ? JSON.parse(q.checkIssues) : [],
      checkEngine: q.checkEngine,
    })),
  });
});

/**
 * POST /api/checks/review/:id
 * Body: { action: "approve" } — keep as-is, mark PASSED (human override)
 *       { action: "remove" }  — soft-delete (excluded from bank entirely)
 *       { action: "edit", data: { questionText?, optionA?, ... } } — fix and re-check
 */
router.post('/review/:id', async (req, res) => {
  const { action, data } = req.body;
  const q = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!q) return res.status(404).json({ error: 'Question not found.' });
  if (q.workflowState !== 'IN_QC' && q.checkStatus !== 'FLAGGED') {
    return res.status(400).json({ error: 'This question is not currently in review.' });
  }

  if (action === 'approve') {
    await prisma.question.update({
      where: { id: q.id },
      data: { checkStatus: 'PASSED', checkIssues: null, workflowState: 'BANK' },
    });
    return res.json({ ok: true, status: 'PASSED' });
  }

  if (action === 'remove') {
    await prisma.question.update({ where: { id: q.id }, data: { isActive: false } });
    return res.json({ ok: true, removed: true });
  }

  if (action === 'edit') {
    const allowedFields = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'];
    const updateData = {};
    for (const field of allowedFields) {
      if (data && field in data) updateData[field] = data[field];
    }
    updateData.checkStatus = null; // will be re-checked on next "Run checks"
    updateData.checkIssues = null;
    await prisma.question.update({ where: { id: q.id }, data: updateData });
    return res.json({ ok: true, status: 'PENDING_RECHECK' });
  }

  res.status(400).json({ error: 'action must be "approve", "remove", or "edit".' });
});

/**
 * GET /api/checks/stats
 */
router.get('/stats', async (req, res) => {
  const [unchecked, passed, flagged, bySubject] = await Promise.all([
    prisma.question.count({ where: { isActive: true, workflowState: 'IN_QC', checkStatus: null } }),
    prisma.question.count({ where: { isActive: true, workflowState: 'BANK' } }),
    prisma.question.count({ where: { isActive: true, workflowState: 'IN_QC', checkStatus: 'FLAGGED' } }),
    prisma.question.findMany({
      where: { isActive: true, workflowState: 'IN_QC', checkStatus: 'FLAGGED' },
      include: { chapter: { include: { subject: true } } },
    }),
  ]);

  const subjectCounts = {};
  for (const q of bySubject) {
    const name = q.chapter?.subject?.name || 'Unknown';
    subjectCounts[name] = (subjectCounts[name] || 0) + 1;
  }

  res.json({ unchecked, passed, flagged, flaggedBySubject: subjectCounts });
});

module.exports = router;
