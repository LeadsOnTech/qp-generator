const express = require('express');
const router = express.Router();
const prisma = require('../db');
const {
  generateCbtCode,
  generateExamPin,
  parseRosterInput,
  sanitizeQuestionsForExam,
  evaluateSubmission,
  buildLeaderboard,
} = require('../lib/cbtEngine');

/**
 * Helper to fetch questions for a paper in exact order.
 */
async function getPaperOrderedQuestions(paperId) {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          question: {
            include: {
              subject: true,
              chapter: true,
            },
          },
        },
      },
    },
  });

  if (!paper) return null;

  return paper.questions.map((pq, idx) => ({
    ...pq.question,
    order: pq.order || idx + 1,
  }));
}

/**
 * POST /api/cbt/create
 * Teacher creates an online CBT test from an existing paper.
 */
router.post('/create', async (req, res) => {
  try {
    const {
      paperId,
      securityMode = 'STRICT_ROSTER',
      examPin,
      rosterInput,
      durationMinutes = 60,
      positiveMarks = 4.0,
      negativeMarks = 1.0,
      showSolutionsImmediate = true,
      allowSingleAttempt = true,
    } = req.body;

    if (!paperId) {
      return res.status(400).json({ error: 'paperId is required' });
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        institute: true,
        questions: true,
      },
    });

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (paper.questions.length === 0) {
      return res.status(400).json({ error: 'Paper has no questions yet' });
    }

    // Generate unique slug
    let code = generateCbtCode();
    let collisionCheck = await prisma.cbtTest.findUnique({ where: { code } });
    while (collisionCheck) {
      code = generateCbtCode();
      collisionCheck = await prisma.cbtTest.findUnique({ where: { code } });
    }

    const pin = securityMode === 'PIN_PROTECTED' ? (examPin || generateExamPin()) : null;
    const parsedRoster = parseRosterInput(rosterInput);

    const test = await prisma.cbtTest.create({
      data: {
        code,
        paperId: paper.id,
        instituteId: paper.instituteId || null,
        title: paper.title,
        examName: paper.examName,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        securityMode,
        examPin: pin,
        rosterJson: parsedRoster.length > 0 ? JSON.stringify(parsedRoster) : null,
        allowSingleAttempt: Boolean(allowSingleAttempt),
        positiveMarks: parseFloat(positiveMarks) || 4.0,
        negativeMarks: parseFloat(negativeMarks) || 0.0,
        showSolutionsImmediate: Boolean(showSolutionsImmediate),
        isResultsReleased: Boolean(showSolutionsImmediate),
        status: 'ACTIVE',
      },
    });

    res.json({
      ok: true,
      test: {
        ...test,
        rosterCount: parsedRoster.length,
      },
    });
  } catch (err) {
    console.error('Failed to create CBT test:', err);
    res.status(500).json({ error: 'Failed to create CBT test: ' + err.message });
  }
});

/**
 * GET /api/cbt/paper/:paperId
 * Lists all CBT tests created for a given paper.
 */
router.get('/paper/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;
    const tests = await prisma.cbtTest.findMany({
      where: { paperId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    res.json(tests);
  } catch (err) {
    console.error('Failed to list paper CBT tests:', err);
    res.status(500).json({ error: 'Failed to load CBT tests' });
  }
});

/**
 * GET /api/cbt/test/:code
 * Public metadata endpoint for students landing on the exam link.
 */
router.get('/test/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const test = await prisma.cbtTest.findUnique({
      where: { code },
      include: {
        paper: {
          include: {
            institute: true,
            questions: true,
          },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Exam test link not found or expired' });
    }

    res.json({
      code: test.code,
      title: test.title,
      examName: test.examName,
      instituteName: test.paper.instituteName || test.paper.institute?.name || 'Academic Institute',
      durationMinutes: test.durationMinutes,
      totalQuestions: test.paper.questions.length,
      securityMode: test.securityMode,
      hasPin: Boolean(test.examPin),
      status: test.status,
      positiveMarks: test.positiveMarks,
      negativeMarks: test.negativeMarks,
      windowStartsAt: test.windowStartsAt,
      windowEndsAt: test.windowEndsAt,
    });
  } catch (err) {
    console.error('Failed to load test info:', err);
    res.status(500).json({ error: 'Failed to load exam details' });
  }
});

/**
 * POST /api/cbt/test/:code/verify
 * Verifies student credentials, checks single attempt, and issues sanitized exam questions.
 */
router.post('/test/:code/verify', async (req, res) => {
  try {
    const { code } = req.params;
    const { rollNumber, studentName, pin, section, phone } = req.body;

    if (!rollNumber || !String(rollNumber).trim()) {
      return res.status(400).json({ error: 'Roll number / Hall ticket number is required' });
    }
    if (!studentName || !String(studentName).trim()) {
      return res.status(400).json({ error: 'Student full name is required' });
    }

    const test = await prisma.cbtTest.findUnique({
      where: { code },
      include: {
        paper: {
          include: {
            institute: true,
          },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Exam link not found' });
    }

    if (test.status !== 'ACTIVE') {
      return res.status(403).json({ error: `Exam is currently ${test.status.toLowerCase()}. Please contact your college coordinator.` });
    }

    const normRoll = String(rollNumber).trim().toUpperCase();

    // 1. PIN Check
    if (test.securityMode === 'PIN_PROTECTED') {
      if (!pin || String(pin).trim() !== String(test.examPin).trim()) {
        return res.status(401).json({ error: 'Invalid 4-digit Exam PIN. Please check with your faculty.' });
      }
    }

    // 2. Roster Check
    let isVerifiedStudent = true;
    if (test.securityMode === 'STRICT_ROSTER') {
      let roster = [];
      try {
        roster = test.rosterJson ? JSON.parse(test.rosterJson) : [];
      } catch {
        roster = [];
      }

      if (roster.length > 0 && !roster.includes(normRoll)) {
        return res.status(403).json({
          error: `Roll Number "${normRoll}" is not enrolled in this batch. Outside student access is restricted.`,
        });
      }
    } else if (test.securityMode === 'OPEN_PRACTICE') {
      let roster = [];
      try {
        roster = test.rosterJson ? JSON.parse(test.rosterJson) : [];
      } catch {
        roster = [];
      }
      if (roster.length > 0 && !roster.includes(normRoll)) {
        isVerifiedStudent = false; // Quarantined
      }
    }

    // 3. Single-Attempt Check
    if (test.allowSingleAttempt) {
      const existing = await prisma.cbtSubmission.findFirst({
        where: {
          testId: test.id,
          rollNumber: normRoll,
        },
      });

      if (existing) {
        return res.status(409).json({
          error: `Roll Number "${normRoll}" has already submitted this exam on ${new Date(existing.submittedAt || existing.startedAt).toLocaleTimeString('en-IN')}. Retakes are disabled.`,
        });
      }
    }

    // 4. Load sanitized questions
    const questions = await getPaperOrderedQuestions(test.paperId);
    const sanitized = sanitizeQuestionsForExam(questions);

    res.json({
      ok: true,
      student: {
        studentName: String(studentName).trim(),
        rollNumber: normRoll,
        section: section ? String(section).trim() : null,
        phone: phone ? String(phone).trim() : null,
        isVerifiedStudent,
      },
      durationMinutes: test.durationMinutes,
      questions: sanitized,
    });
  } catch (err) {
    console.error('Failed to verify student:', err);
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

/**
 * POST /api/cbt/test/:code/submit
 * Submits student answers, evaluates score, records submission in database.
 */
router.post('/test/:code/submit', async (req, res) => {
  try {
    const { code } = req.params;
    const {
      rollNumber,
      studentName,
      section,
      phone,
      answers = {},
      timeSpentSeconds = 0,
      tabSwitchCount = 0,
      isVerifiedStudent = true,
    } = req.body;

    const normRoll = String(rollNumber).trim().toUpperCase();

    const test = await prisma.cbtTest.findUnique({
      where: { code },
    });

    if (!test) {
      return res.status(404).json({ error: 'Exam test not found' });
    }

    // Check single attempt to prevent concurrent double-submissions
    if (test.allowSingleAttempt) {
      const existing = await prisma.cbtSubmission.findFirst({
        where: {
          testId: test.id,
          rollNumber: normRoll,
        },
      });
      if (existing) {
        return res.status(409).json({ error: 'Exam was already submitted for this roll number.' });
      }
    }

    const questions = await getPaperOrderedQuestions(test.paperId);
    const evalResult = evaluateSubmission(questions, answers, {
      positiveMarks: test.positiveMarks,
      negativeMarks: test.negativeMarks,
    });

    const submission = await prisma.cbtSubmission.create({
      data: {
        testId: test.id,
        studentName: String(studentName).trim(),
        rollNumber: normRoll,
        studentPhone: phone ? String(phone).trim() : null,
        section: section ? String(section).trim() : null,
        isVerifiedStudent: Boolean(isVerifiedStudent),
        tabSwitchCount: parseInt(tabSwitchCount, 10) || 0,
        answersJson: JSON.stringify(answers),
        score: evalResult.score,
        maxScore: evalResult.maxScore,
        correctCount: evalResult.correctCount,
        incorrectCount: evalResult.incorrectCount,
        unattemptedCount: evalResult.unattemptedCount,
        accuracyPercentage: evalResult.accuracyPercentage,
        timeSpentSeconds: parseInt(timeSpentSeconds, 10) || 0,
        submittedAt: new Date(),
        status: 'SUBMITTED',
      },
    });

    const showSolutions = test.showSolutionsImmediate || test.isResultsReleased;

    res.json({
      ok: true,
      submissionId: submission.id,
      score: evalResult.score,
      maxScore: evalResult.maxScore,
      correctCount: evalResult.correctCount,
      incorrectCount: evalResult.incorrectCount,
      unattemptedCount: evalResult.unattemptedCount,
      accuracyPercentage: evalResult.accuracyPercentage,
      showSolutions,
      itemDetails: showSolutions ? evalResult.itemDetails : null,
    });
  } catch (err) {
    console.error('Failed to submit exam:', err);
    res.status(500).json({ error: 'Failed to submit exam: ' + err.message });
  }
});

/**
 * GET /api/cbt/test/:code/leaderboard
 * Teacher dashboard view: real-time rank list, verified vs quarantined entries, aggregate stats.
 */
router.get('/test/:code/leaderboard', async (req, res) => {
  try {
    const { code } = req.params;
    const test = await prisma.cbtTest.findUnique({
      where: { code },
      include: {
        paper: {
          include: {
            institute: true,
          },
        },
        submissions: {
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Exam test not found' });
    }

    const questions = await getPaperOrderedQuestions(test.paperId);
    const leaderboard = buildLeaderboard(test.submissions, questions);

    res.json({
      test: {
        id: test.id,
        code: test.code,
        title: test.title,
        examName: test.examName,
        instituteName: test.paper.instituteName || test.paper.institute?.name || 'Academic Institute',
        durationMinutes: test.durationMinutes,
        securityMode: test.securityMode,
        examPin: test.examPin,
        positiveMarks: test.positiveMarks,
        negativeMarks: test.negativeMarks,
        status: test.status,
        isResultsReleased: test.isResultsReleased,
        totalQuestions: questions.length,
      },
      ...leaderboard,
    });
  } catch (err) {
    console.error('Failed to get leaderboard:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * DELETE /api/cbt/test/:code/submissions/:submissionId
 * Teacher can delete a spam / guest / duplicate submission.
 */
router.delete('/test/:code/submissions/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    await prisma.cbtSubmission.delete({
      where: { id: submissionId },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete submission:', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

/**
 * PATCH /api/cbt/test/:code/toggle-status
 * Teacher toggles test status (ACTIVE / PAUSED / COMPLETED).
 */
router.patch('/test/:code/toggle-status', async (req, res) => {
  try {
    const { code } = req.params;
    const { status } = req.body;
    if (!['ACTIVE', 'PAUSED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await prisma.cbtTest.update({
      where: { code },
      data: { status },
    });

    res.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error('Failed to toggle test status:', err);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

module.exports = router;
