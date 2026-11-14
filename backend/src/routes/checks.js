const express = require('express');
const prisma = require('../db');
const { runChecks, ruleBasedCheck, isNVQQuestion } = require('../lib/checkEngine');
const { extractImageFilenames, purgeUnreferencedImages } = require('../lib/diagramCleaner');

const router = express.Router();

/**
 * POST /api/checks/run
 * Runs the subject-specialist checkers on questions. If new unchecked questions
 * exist, checks them. If no unchecked questions remain, re-evaluates FLAGGED
 * questions so updated rules (like NVQ support) can automatically clear them.
 */
router.post('/run', async (req, res) => {
  const recheckFlagged = req.query.recheckFlagged === 'true' || req.body?.recheckFlagged === true;
  let questionsToCheck = await prisma.question.findMany({
    where: { isActive: true, checkStatus: null },
    include: { chapter: { include: { subject: true } } },
    take: 500,
  });

  let isRecheckMode = false;
  if (questionsToCheck.length === 0 || recheckFlagged) {
    const flagged = await prisma.question.findMany({
      where: { isActive: true, checkStatus: 'FLAGGED' },
      include: { chapter: { include: { subject: true } } },
      take: 500,
    });
    if (flagged.length > 0) {
      questionsToCheck = flagged;
      isRecheckMode = true;
    }
  }

  if (questionsToCheck.length === 0) {
    return res.json({ checked: 0, engine: null, message: 'Every active question has already been checked and no flagged questions remain.' });
  }

  const inputs = questionsToCheck.map((q) => ({
    questionText: q.questionText,
    options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
    correctOption: q.correctOption,
    questionType: q.questionType,
    subject: q.chapter?.subject?.name,
    chapter: q.chapter?.name,
  }));

  const results = await runChecks(inputs);

  for (let i = 0; i < questionsToCheck.length; i++) {
    await prisma.question.update({
      where: { id: questionsToCheck[i].id },
      data: {
        checkStatus: results[i].status,
        checkIssues: results[i].issues.length ? JSON.stringify(results[i].issues) : null,
        checkEngine: results[i].engine,
        checkedAt: new Date(),
        workflowState: 'BANK',
      },
    });
  }

  const flaggedCount = results.filter((r) => r.status === 'FLAGGED').length;
  const passedCount = questionsToCheck.length - flaggedCount;
  const engines = [...new Set(results.map((r) => r.engine))];

  const prefix = isRecheckMode ? 'Re-checked' : 'Checked';
  res.json({
    checked: questionsToCheck.length,
    flagged: flaggedCount,
    passed: passedCount,
    engine: engines.join(' + '),
    message: `${prefix} ${questionsToCheck.length} questions — ${passedCount} passed and ${flaggedCount} flagged for review.`,
  });
});

/**
 * POST /api/checks/auto-heal-nvq
 * Automatically re-checks, repairs, and approves all FLAGGED questions that are NVQs:
 * 1. If correctOption is a letter ('A', 'B', etc.) but the true numerical answer was placed in optionA (or dummy '-' options).
 * 2. If the AI specialist checker identified the exact numerical answer in checkIssues (e.g. "The correct numerical answer is 3").
 * 3. If the question is a valid NVQ that passed standard numerical validation.
 */
router.post('/auto-heal-nvq', async (req, res) => {
  const flagged = await prisma.question.findMany({
    where: { isActive: true, checkStatus: 'FLAGGED' },
    include: { chapter: { include: { subject: true } } },
  });

  let approvedCount = 0;
  for (const q of flagged) {
    const qType = String(q.questionType || '').trim().toUpperCase();
    const isNVQ = isNVQQuestion({
      questionType: q.questionType,
      options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
      correctOption: q.correctOption,
    }) || ['NVQ', 'NUMERICAL', 'DECIMAL', 'NVT'].includes(qType) || /_{2,}\.?\s*$/.test(String(q.questionText || '').trim());

    if (!isNVQ) continue;

    let candidateAns = String(q.correctOption || '').trim();
    let isRepaired = false;

    // Case 1: Letter answer ('A', 'B', 'C', 'D') where optionA or marked option holds the real numerical value
    if (['A', 'B', 'C', 'D'].includes(candidateAns.toUpperCase())) {
      const optKey = candidateAns.toUpperCase();
      const rawOptVal = q[`option${optKey}`] || q.optionA;
      const cleanVal = String(rawOptVal || '').trim();
      const isNum = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s*(?:to|-)\s*-?\d+(?:\.\d+)?)?$/i.test(cleanVal) || !isNaN(Number(cleanVal)) || /^\d+\/\d+$/.test(cleanVal);
      if (cleanVal && isNum && cleanVal !== '-') {
        candidateAns = cleanVal;
        isRepaired = true;
      }
    }

    // Case 2: AI specialist identified the correct numerical answer in the check issues text
    // e.g. "The correct numerical answer is 3, but the provided answer key is 'A' (a letter instead of a number)."
    if (['A', 'B', 'C', 'D'].includes(candidateAns.toUpperCase()) || !/^-?\d+(?:\.\d+)?/i.test(candidateAns)) {
      if (q.checkIssues) {
        const issuesStr = typeof q.checkIssues === 'string' ? q.checkIssues : JSON.stringify(q.checkIssues);
        const match = issuesStr.match(/correct numerical answer is\s*([±\-+]?\d+(?:\.\d+)?|\d+\/\d+)/i) ||
                      issuesStr.match(/numerical answer is\s*([±\-+]?\d+(?:\.\d+)?|\d+\/\d+)/i) ||
                      issuesStr.match(/answer is\s*([±\-+]?\d+(?:\.\d+)?|\d+\/\d+)/i);
        if (match && match[1]) {
          candidateAns = match[1].trim();
          isRepaired = true;
        }
      }
    }

    // Validate if the resulting candidateAns is a valid numerical answer
    const isNumeric = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s*(?:to|-)\s*-?\d+(?:\.\d+)?)?$/i.test(candidateAns) || !isNaN(Number(candidateAns)) || /^\d+\/\d+$/.test(candidateAns);

    if (isNumeric) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          correctOption: candidateAns,
          questionType: 'NVQ',
          optionA: null,
          optionB: null,
          optionC: null,
          optionD: null,
          checkStatus: 'PASSED',
          checkIssues: null,
          checkEngine: isRepaired ? 'AUTO_HEALED_NVQ' : (q.checkEngine || 'RULE_BASED'),
          checkedAt: new Date(),
          workflowState: 'BANK',
        },
      });
      approvedCount++;
    } else {
      // Standard check fallback for questions that already had a valid numerical answer
      const result = ruleBasedCheck({
        questionText: q.questionText,
        options: { A: null, B: null, C: null, D: null },
        correctOption: q.correctOption,
        questionType: 'NVQ',
        subject: q.chapter?.subject?.name,
        chapter: q.chapter?.name,
      });

      if (result.status === 'PASSED') {
        await prisma.question.update({
          where: { id: q.id },
          data: {
            questionType: 'NVQ',
            optionA: null,
            optionB: null,
            optionC: null,
            optionD: null,
            checkStatus: 'PASSED',
            checkIssues: null,
            checkEngine: 'RULE_BASED',
            checkedAt: new Date(),
            workflowState: 'BANK',
          },
        });
        approvedCount++;
      }
    }
  }

  return res.json({
    ok: true,
    approvedCount,
    message: approvedCount > 0
      ? `Successfully approved and repaired ${approvedCount} Numerical Value Question(s) with their correct numerical answers.`
      : 'No valid NVQ questions needed auto-approval.',
  });
});

/**
 * POST /api/checks/review/bulk-approve
 * Approves multiple questions at once. Body: { ids?: string[] } (if empty/omitted, approves all currently flagged)
 */
router.post('/review/bulk-approve', async (req, res) => {
  const { ids } = req.body || {};
  const where = { isActive: true, checkStatus: 'FLAGGED' };
  if (Array.isArray(ids) && ids.length > 0) {
    where.id = { in: ids };
  }

  // Pre-heal any NVQs where the correct numerical answer was in optionA or diagnosed by AI
  const flagged = await prisma.question.findMany({ where });
  for (const q of flagged) {
    let candidateAns = String(q.correctOption || '').trim();
    let isRepaired = false;
    if (['A', 'B', 'C', 'D'].includes(candidateAns.toUpperCase())) {
      const optKey = candidateAns.toUpperCase();
      const rawOptVal = q[`option${optKey}`] || q.optionA;
      const cleanVal = String(rawOptVal || '').trim();
      const isNum = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s*(?:to|-)\s*-?\d+(?:\.\d+)?)?$/i.test(cleanVal) || !isNaN(Number(cleanVal)) || /^\d+\/\d+$/.test(cleanVal);
      if (cleanVal && isNum && cleanVal !== '-') {
        candidateAns = cleanVal;
        isRepaired = true;
      } else if (q.checkIssues) {
        const issuesStr = typeof q.checkIssues === 'string' ? q.checkIssues : JSON.stringify(q.checkIssues);
        const match = issuesStr.match(/correct numerical answer is\s*([±\-+]?\d+(?:\.\d+)?|\d+\/\d+)/i) ||
                      issuesStr.match(/numerical answer is\s*([±\-+]?\d+(?:\.\d+)?|\d+\/\d+)/i);
        if (match && match[1]) {
          candidateAns = match[1].trim();
          isRepaired = true;
        }
      }
    }
    if (isRepaired) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          correctOption: candidateAns,
          questionType: 'NVQ',
          optionA: null,
          optionB: null,
          optionC: null,
          optionD: null,
        },
      });
    }
  }

  const result = await prisma.question.updateMany({
    where,
    data: {
      checkStatus: 'PASSED',
      checkIssues: null,
      workflowState: 'BANK',
      checkedAt: new Date(),
    },
  });

  res.json({
    ok: true,
    approvedCount: result.count,
    message: `Successfully approved ${result.count} question(s) and added them to Question Bank.`,
  });
});

/**
 * GET /api/checks/review — the flagged-question queue
 */
router.get('/review', async (req, res) => {
  const { page = '1', pageSize = '25', subject } = req.query;
  const take = Math.min(parseInt(pageSize, 10) || 25, 200);
  let requestedPage = Math.max(parseInt(page, 10) || 1, 1);

  const where = { isActive: true, checkStatus: 'FLAGGED' };
  if (subject) where.chapter = { subject: { name: subject } };

  const total = await prisma.question.count({ where });
  const maxPage = Math.max(Math.ceil(total / take), 1);

  // Auto-clamp requestedPage if it exceeds the maximum available pages
  if (requestedPage > maxPage && total > 0) {
    requestedPage = maxPage;
  }
  const skip = (requestedPage - 1) * take;

  const items = await prisma.question.findMany({
    where,
    include: { chapter: { include: { subject: { include: { exam: true } } } } },
    orderBy: { checkedAt: 'desc' },
    take,
    skip,
  });

  res.json({
    total,
    page: requestedPage,
    pageSize: take,
    totalPages: maxPage,
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
  if (q.checkStatus !== 'FLAGGED') {
    return res.status(400).json({ error: 'This question is not currently in review.' });
  }

  if (action === 'approve') {
    let updateData = { checkStatus: 'PASSED', checkIssues: null, workflowState: 'BANK' };
    let candidateAns = String(q.correctOption || '').trim();
    if (['A', 'B', 'C', 'D'].includes(candidateAns.toUpperCase())) {
      const optKey = candidateAns.toUpperCase();
      const rawOptVal = q[`option${optKey}`] || q.optionA;
      const cleanVal = String(rawOptVal || '').trim();
      const isNum = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s*(?:to|-)\s*-?\d+(?:\.\d+)?)?$/i.test(cleanVal) || !isNaN(Number(cleanVal)) || /^\d+\/\d+$/.test(cleanVal);
      if (cleanVal && isNum && cleanVal !== '-') {
        updateData.correctOption = cleanVal;
        updateData.questionType = 'NVQ';
        updateData.optionA = null;
        updateData.optionB = null;
        updateData.optionC = null;
        updateData.optionD = null;
      } else if (q.checkIssues) {
        const issuesStr = typeof q.checkIssues === 'string' ? q.checkIssues : JSON.stringify(q.checkIssues);
        const match = issuesStr.match(/correct numerical answer is\s*([±\-+]?\d+(?:\.\d+)?|\d+\/\d+)/i) ||
                      issuesStr.match(/numerical answer is\s*([±\-+]?\d+(?:\.\d+)?|\d+\/\d+)/i);
        if (match && match[1]) {
          updateData.correctOption = match[1].trim();
          updateData.questionType = 'NVQ';
          updateData.optionA = null;
          updateData.optionB = null;
          updateData.optionC = null;
          updateData.optionD = null;
        }
      }
    }
    await prisma.question.update({
      where: { id: q.id },
      data: updateData,
    });
    return res.json({ ok: true, status: 'PASSED' });
  }

  if (action === 'remove') {
    await prisma.question.update({ where: { id: q.id }, data: { isActive: false } });
    const imgList = extractImageFilenames(q);
    await purgeUnreferencedImages(imgList, [q.id]).catch((e) => console.error('Diagram purge error:', e));
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
    prisma.question.count({ where: { isActive: true, checkStatus: null } }),
    prisma.question.count({ where: { isActive: true, checkStatus: 'PASSED' } }),
    prisma.question.count({ where: { isActive: true, checkStatus: 'FLAGGED' } }),
    prisma.question.findMany({
      where: { isActive: true, checkStatus: 'FLAGGED' },
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
