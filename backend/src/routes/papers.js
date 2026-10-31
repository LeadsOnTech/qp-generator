const express = require('express');
const prisma = require('../db');
const { selectQuestions, findReplacement, shuffle } = require('../lib/paperEngine');
const { buildPaperPdf, buildMasterKeyPdf, buildPaperBundlePdf } = require('../lib/pdfBuilder');
const { generateSetQuestions, generateMasterKeyMatrix } = require('../lib/multiSetEngine');
const { adjustCredits, hasEnoughCredits } = require('../lib/credits');

const router = express.Router();

/**
 * Throws a 403-style rejection object if an INSTITUTE user is trying to
 * touch a paper that doesn't belong to their institute. ADMIN always passes.
 */
function assertPaperAccess(req, paper) {
  if (req.user.role === 'ADMIN') return null;
  if (paper.instituteId !== req.user.instituteId) {
    return { status: 403, error: 'That paper does not belong to your institute account.' };
  }
  return null;
}

function formatPaperQuestion(pq) {
  const q = pq.question;
  return {
    paperQuestionId: pq.id,
    order: pq.order,
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
    solutionText: q.solutionText || null,
    questionType: q.questionType,
    difficulty: q.difficulty,
    imageFilename: q.imageFilename || null,
    imageUrl: q.imageFilename ? `/uploads/images/${q.imageFilename}` : null,
    subject: q.chapter?.subject?.name,
    chapter: q.chapter?.name,
  };
}

/**
 * POST /api/papers/generate
 * Body: { title, instituteName, examName,
 *         subjects: [{ name, count }], chapters?: [names],
 *         difficultyMix?: { easy, medium, hard },  // percentages
 *         avoidRepeats?: true, shuffleQuestions?: true }
 * Creates a DRAFT paper and returns its id + any shortages.
 */
router.post('/generate', async (req, res) => {
  const { title, instituteName, examName, paperType, subjects, chapters, difficultyMix, avoidRepeats, shuffleQuestions, includeSolutions } = req.body;
  // An INSTITUTE user can only ever generate papers under their own
  // account — the instituteId is taken from their login, never from the
  // request body, so there's no way to spoof another institute's branding.
  const instituteId = req.user.role === 'ADMIN' ? (req.body.instituteId || null) : req.user.instituteId;

  if (!title || !examName || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'title, examName, and at least one subject with a count are required.' });
  }
  for (const s of subjects) {
    if (!s.name || (!Number.isInteger(s.mcqCount) && !Number.isInteger(s.nvqCount)) || (s.mcqCount || 0) + (s.nvqCount || 0) < 1) {
      return res.status(400).json({ error: 'Each subject needs a name and a positive whole-number count.' });
    }
  }

  const { selected, shortages } = await selectQuestions({
    examName, subjects, chapters, difficultyMix, avoidRepeats: avoidRepeats !== false,
  });

  if (selected.length === 0) {
    return res.status(400).json({
      error: 'No questions matched this request. Check that the chosen subjects/chapters have active questions in the bank.',
      shortages,
    });
  }

  // Keep subject grouping (Physics block, then Chemistry, etc.) but shuffle
  // within each subject unless shuffling is disabled.
  let ordered = selected;
  if (shuffleQuestions !== false) {
    const bySubject = new Map();
    for (const q of selected) {
      const key = q.chapter.subject.name;
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key).push(q);
    }
    ordered = [];
    for (const [, list] of bySubject) {
      const mcqs = list.filter(q => q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL');
      const nvqs = list.filter(q => q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL');
      ordered.push(...shuffle(mcqs));
      ordered.push(...shuffle(nvqs));
    }
  }

  const paper = await prisma.paper.create({
    data: {
      title,
      instituteName: instituteName || null,
      instituteId: instituteId || null,
      examName,
      paperType: paperType || 'DPP',
      config: JSON.stringify(req.body),
      includeSolutions: includeSolutions === true,
      shortagesNote: shortages.length ? JSON.stringify(shortages) : null,
      questions: {
        create: ordered.map((q, i) => ({ questionId: q.id, order: i + 1 })),
      },
    },
  });

  res.json({ paperId: paper.id, questionCount: ordered.length, shortages });
});

/**
 * GET /api/papers — history list
 */
router.get('/', async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { instituteId: req.user.instituteId };
  const papers = await prisma.paper.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { questions: true } } },
  });
  res.json(papers.map((p) => ({
    id: p.id,
    title: p.title,
    instituteName: p.instituteName,
    examName: p.examName,
    paperType: p.paperType,
    status: p.status,
    questionCount: p._count.questions,
    createdAt: p.createdAt,
    finalizedAt: p.finalizedAt,
  })));
});

/**
 * GET /api/papers/:id — full preview data (supports ?set=A|B|C|D)
 */
router.get('/:id', async (req, res) => {
  const paper = await prisma.paper.findUnique({
    where: { id: req.params.id },
    include: {
      institute: true,
      questions: {
        orderBy: { order: 'asc' },
        include: { question: { include: { chapter: { include: { subject: true } } } } },
      },
    },
  });
  if (!paper) return res.status(404).json({ error: 'Paper not found.' });
  const denied = assertPaperAccess(req, paper);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  let optionFormat = null;
  let answerFormat = 'STANDARD';
  if (paper.config) {
    try {
      const cfg = JSON.parse(paper.config);
      optionFormat = cfg.optionFormat || null;
      answerFormat = cfg.answerFormat || 'STANDARD';
    } catch (e) {}
  }

  const requestedSet = (req.query.set || 'A').toUpperCase();
  const rawQuestions = paper.questions.map(formatPaperQuestion);
  const questions = generateSetQuestions(paper.id, rawQuestions, requestedSet);

  res.json({
    id: paper.id,
    title: paper.title,
    instituteName: paper.institute?.name || paper.instituteName,
    instituteLogoUrl: paper.institute?.logoFilename ? `/uploads/images/${paper.institute.logoFilename}` : null,
    examName: paper.examName,
    paperType: paper.paperType,
    optionFormat,
    answerFormat,
    activeSet: `SET ${requestedSet}`,
    availableSets: ['A', 'B', 'C', 'D'],
    status: paper.status,
    includeSolutions: paper.includeSolutions,
    // How many of this paper's questions actually have a solution — this
    // is what will be charged (1 credit each) if includeSolutions is on.
    availableSolutionCount: paper.questions.filter(
      (pq) => pq.question && pq.question.solutionText && pq.question.solutionText.trim()
    ).length,
    createdAt: paper.createdAt,
    finalizedAt: paper.finalizedAt,
    shortages: paper.shortagesNote ? JSON.parse(paper.shortagesNote) : [],
    questions,
  });
});

/**
 * GET /api/papers/:id/master-key — Synced Master Answer Key (Sets A, B, C, D)
 */
router.get('/:id/master-key', async (req, res) => {
  const paper = await prisma.paper.findUnique({
    where: { id: req.params.id },
    include: {
      institute: true,
      questions: {
        orderBy: { order: 'asc' },
        include: { question: { include: { chapter: { include: { subject: true } } } } },
      },
    },
  });
  if (!paper) return res.status(404).json({ error: 'Paper not found.' });
  const denied = assertPaperAccess(req, paper);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  let optionFormat = req.query.optionFormat || null;
  if (!optionFormat && paper.config) {
    try {
      const cfg = JSON.parse(paper.config);
      optionFormat = cfg.optionFormat || null;
    } catch (e) {}
  }

  const baseQuestions = paper.questions.map(formatPaperQuestion);
  const matrix = generateMasterKeyMatrix(paper.id, baseQuestions, optionFormat);

  res.json({
    paperId: paper.id,
    title: paper.title,
    instituteName: paper.institute?.name || paper.instituteName,
    examName: paper.examName,
    optionFormat,
    ...matrix,
  });
});

/**
 * POST /api/papers/:id/swap
 * Body: { questionId }
 * Replaces one question on a DRAFT paper with a similar one
 * (same subject, same difficulty, preferring same chapter).
 */
router.post('/:id/swap', async (req, res) => {
  const paper = await prisma.paper.findUnique({
    where: { id: req.params.id },
    include: {
      questions: {
        include: { question: { include: { chapter: { include: { subject: true } } } } },
      },
    },
  });
  if (!paper) return res.status(404).json({ error: 'Paper not found.' });
  const denied = assertPaperAccess(req, paper);
  if (denied) return res.status(denied.status).json({ error: denied.error });
  if (paper.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Only draft papers can be edited. This paper is already finalized.' });
  }

  const target = paper.questions.find((pq) => pq.questionId === req.body.questionId);
  if (!target) return res.status(404).json({ error: 'That question is not on this paper.' });

  const excludeIds = new Set(paper.questions.map((pq) => pq.questionId));
  const replacement = await findReplacement({
    examName: paper.examName,
    question: target.question,
    excludeIds,
  });

  if (!replacement) {
    return res.status(409).json({
      error: `No alternative ${target.question.chapter.subject.name} question available in the bank to swap in.`,
    });
  }

  await prisma.paperQuestion.update({
    where: { id: target.id },
    data: { questionId: replacement.id },
  });

  res.json({
    swapped: true,
    newQuestion: {
      paperQuestionId: target.id,
      order: target.order,
      id: replacement.id,
      questionText: replacement.questionText,
      options: { A: replacement.optionA, B: replacement.optionB, C: replacement.optionC, D: replacement.optionD },
      correctOption: replacement.correctOption,
      questionType: replacement.questionType,
      difficulty: replacement.difficulty,
      subject: replacement.chapter?.subject?.name,
      chapter: replacement.chapter?.name,
    },
  });
});

/**
 * POST /api/papers/:id/finalize
 * Locks the paper and records usage on every question (drives no-repeat).
 */
router.post('/:id/finalize', async (req, res) => {
  const paper = await prisma.paper.findUnique({
    where: { id: req.params.id },
    include: { questions: { include: { question: true } } },
  });
  if (!paper) return res.status(404).json({ error: 'Paper not found.' });
  const denied = assertPaperAccess(req, paper);
  if (denied) return res.status(denied.status).json({ error: denied.error });
  if (paper.status === 'FINALIZED') return res.json({ ok: true, alreadyFinalized: true });

  const questionCount = paper.questions.length;

  // Solutions are charged 1 credit each — but ONLY for questions that
  // actually have a solution available, and ONLY if this paper was
  // generated with "include solutions" turned on. You can't charge for a
  // solution that doesn't exist. The answer key is always free.
  const solutionCount = paper.includeSolutions
    ? paper.questions.filter((pq) => pq.question && pq.question.solutionText && pq.question.solutionText.trim()).length
    : 0;
  const totalCost = questionCount + solutionCount;

  // Credits only apply to papers linked to an institute (1 credit = 1
  // question, +1 per included solution).
  if (paper.instituteId) {
    const enough = await hasEnoughCredits(paper.instituteId, totalCost);
    if (!enough) {
      const institute = await prisma.institute.findUnique({ where: { id: paper.instituteId } });
      const breakdown = solutionCount > 0
        ? `${questionCount} questions + ${solutionCount} solutions = ${totalCost} credits`
        : `${totalCost} credits`;
      return res.status(402).json({
        error: institute?.isTrial
          ? `Your free trial credits are used up (this paper needs ${breakdown}, you have ${institute?.creditBalance ?? 0}). Contact us to subscribe and keep generating papers.`
          : `Not enough credits (this paper needs ${breakdown}, you have ${institute?.creditBalance ?? 0}). Please recharge to finalize this paper.`,
        creditsNeeded: totalCost,
        questionCount,
        solutionCount,
        creditsAvailable: institute?.creditBalance ?? 0,
      });
    }
  }

  await prisma.paper.update({
    where: { id: paper.id },
    data: { status: 'FINALIZED', finalizedAt: new Date() },
  });

  for (const pq of paper.questions) {
    await prisma.question.update({
      where: { id: pq.questionId },
      data: { timesUsed: { increment: 1 }, lastUsedAt: new Date() },
    });
  }

  let creditsRemaining = null;
  if (paper.instituteId) {
    const reason = solutionCount > 0
      ? `Paper: ${paper.title} (${questionCount} Q + ${solutionCount} solutions)`
      : `Paper: ${paper.title}`;
    const { institute } = await adjustCredits(paper.instituteId, -totalCost, reason);
    creditsRemaining = institute.creditBalance;
  }

  res.json({
    ok: true,
    creditsSpent: paper.instituteId ? totalCost : 0,
    questionCount,
    solutionCount,
    creditsRemaining,
  });
});

/**
 * GET /api/papers/:id/pdf?answers=1
 * Streams the PDF. answers=1 appends the answer-key page.
 */
router.get('/:id/pdf', async (req, res) => {
  const paper = await prisma.paper.findUnique({
    where: { id: req.params.id },
    include: {
      institute: true,
      questions: {
        orderBy: { order: 'asc' },
        include: { question: { include: { chapter: { include: { subject: true } } } } },
      },
    },
  });
  if (!paper) return res.status(404).json({ error: 'Paper not found.' });
  const denied = assertPaperAccess(req, paper);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const withAnswers = req.query.answers === '1';
  const isBundle = req.query.bundle === '1';
  const isMasterKey = req.query.masterKey === '1';
  const setChar = (req.query.set || 'A').toUpperCase();
  const rawQuestions = paper.questions.map(formatPaperQuestion);

  let optionFormat = req.query.optionFormat || null;
  let answerFormat = req.query.answerFormat || null;
  if ((!optionFormat || !answerFormat) && paper.config) {
    try {
      const cfg = JSON.parse(paper.config);
      if (!optionFormat) optionFormat = cfg.optionFormat || null;
      if (!answerFormat) answerFormat = cfg.answerFormat || null;
    } catch (e) {}
  }

  // If a saved Institute is linked, its logo/phone/address/tagline take
  // priority for the letterhead; instituteName stays as a plain-text
  // fallback for papers with no saved profile attached.
  const brandedPaper = {
    ...paper,
    instituteName: paper.institute?.name || paper.instituteName,
    instituteLogoFilename: paper.institute?.logoFilename || null,
    institutePhone: paper.institute?.phone || null,
    instituteAddress: paper.institute?.address || null,
    instituteTagline: paper.institute?.tagline || null,
    optionFormat,
    answerFormat,
  };

  const safeTitle = paper.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (isBundle) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle}_all_sets_bundle.pdf"`
    );
    return buildPaperBundlePdf(res, brandedPaper, rawQuestions, withAnswers);
  }

  if (isMasterKey) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle}_synced_master_key.pdf"`
    );
    return buildMasterKeyPdf(res, brandedPaper, rawQuestions, optionFormat);
  }

  const setQuestions = generateSetQuestions(paper.id, rawQuestions, setChar);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle}_Set_${setChar}${withAnswers ? '_with_answer_key' : ''}.pdf"`
  );

  buildPaperPdf(res, { ...brandedPaper, setLabel: `SET ${setChar}` }, setQuestions, withAnswers);
});


/**
 * DELETE /api/papers/:id
 * Delete a paper. Only allowed if you own it, or if admin.
 */
router.delete('/:id', async (req, res) => {
  try {
    const paper = await prisma.paper.findUnique({ where: { id: req.params.id } });
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });

    if (req.user.role !== 'ADMIN' && paper.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Not authorized to delete this paper.' });
    }

    // Delete paper - Prisma cascade deletes paperQuestions if configured, else manual
    await prisma.paperQuestion.deleteMany({ where: { paperId: req.params.id } });
    await prisma.paper.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete paper error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
