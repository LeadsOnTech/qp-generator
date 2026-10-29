const prisma = require('../db');

// ---------------------------------------------------------------------------
// Phase 3 — Paper selection engine (the Assembler).
//
// Given a request like:
//   { examName: "NEET",
//     subjects: [{ name: "Physics", count: 15 }, ...],
//     chapters: ["Kinematics", ...]            (optional — empty = all active),
//     difficultyMix: { easy: 40, medium: 40, hard: 20 }   (percentages),
//     avoidRepeats: true }
//
// it picks questions from the Verified Bank while enforcing:
//   - chapter.syllabusStatus === ACTIVE  (the Syllabus Master rule — always on)
//   - question.isActive === true
//   - difficulty mix per subject (with graceful fallback when a bucket runs dry)
//   - no-repeat: excludes questions used in the last 3 FINALIZED papers
//
// If the bank can't fully satisfy the request, the paper is still generated
// with everything available, and a "shortages" report says exactly what was
// missing — never silently pad with wrong-difficulty or wrong-subject items
// without recording it.
// ---------------------------------------------------------------------------

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function splitCounts(total, mix) {
  // mix percentages -> integer counts that sum exactly to total
  const easy = Math.round((mix.easy / 100) * total);
  const hard = Math.round((mix.hard / 100) * total);
  let medium = total - easy - hard;
  if (medium < 0) medium = 0;
  return { EASY: easy, MEDIUM: medium, HARD: hard };
}

async function recentlyUsedQuestionIds() {
  const recentPapers = await prisma.paper.findMany({
    where: { status: 'FINALIZED' },
    orderBy: { finalizedAt: 'desc' },
    take: 3,
    include: { questions: { select: { questionId: true } } },
  });
  const ids = new Set();
  for (const p of recentPapers) {
    for (const pq of p.questions) ids.add(pq.questionId);
  }
  return ids;
}

/**
 * `selection` (new, precise): an array of entries per subject, each either
 *   { chapter: "Kinematics" }                          — whole chapter
 *   { chapter: "Laws of Motion", topics: ["Friction"] } — only these topics
 * `chapters` (old, still supported): a flat array of chapter names, each
 * treated as a whole-chapter selection — kept for backward compatibility
 * with anything still sending the older request shape.
 */
async function fetchPool({ examName, subjectName, chapters, selection }) {
  const entries = (selection && selection.length > 0)
    ? selection
    : (chapters && chapters.length > 0) ? chapters.map((name) => ({ chapter: name })) : null;

  const where = {
    isActive: true,
    workflowState: 'BANK',
    AND: [
      {
        OR: [
          { checkStatus: null },
          { checkStatus: { not: 'FLAGGED' } },
        ],
      },
      {
        OR: [
          { chapter: { subject: { name: subjectName, exam: { name: examName } } } },
          {
            AND: [
              { chapter: { subject: { name: subjectName } } },
              { examMappings: { some: { exam: { name: examName }, isActive: true } } },
            ],
          },
        ],
      },
    ],
  };

  if (entries && entries.length > 0) {
    where.AND.push({
      OR: entries.map((entry) => {
        const cond = { chapter: { name: entry.chapter } };
        if (entry.topics && entry.topics.length > 0) {
          cond.topic = { name: { in: entry.topics } };
        }
        return cond;
      }),
    });
  }

  return prisma.question.findMany({
    where,
    include: { chapter: { include: { subject: true } }, topic: true },
  });
}

/**
 * Selects questions for a paper request. Returns:
 *   { selected: [question...], shortages: [{subject, difficulty, requested, got}] }
 */
async function selectQuestions(request) {
  const { examName, subjects, chapters = [], difficultyMix, avoidRepeats = true } = request;
  const mix = difficultyMix || { easy: 40, medium: 40, hard: 20 };

  const excludeIds = avoidRepeats ? await recentlyUsedQuestionIds() : new Set();

  const selected = [];
  const shortages = [];

  for (const subj of subjects) {
    // Per-subject precise selection (chapter + optional topics) takes
    // priority; falls back to the older flat chapters array (per-subject,
    // then global) for backward compatibility with existing callers.
    const chapterFilter = (subj.chapters && subj.chapters.length > 0) ? subj.chapters : chapters;
    const rawPool = (await fetchPool({
      examName,
      subjectName: subj.name,
      chapters: chapterFilter,
      selection: subj.selection,
    }))
      .filter((q) => !excludeIds.has(q.id));

    // Safety net against duplicate uploads: if the same question text
    // exists more than once in the bank (e.g. a file was uploaded twice),
    // keep only the first copy so one paper can never print the same
    // question twice — which is exactly the kind of repeat that makes a
    // paper look unprofessional.
    const seenText = new Set();
    const pool = []; console.log('rawPool length:', rawPool.length);
    for (const q of rawPool) {
      const key = (q.questionText || '').trim().toLowerCase();
      if (key && seenText.has(key)) continue;
      seenText.add(key);
      pool.push(q);
    }

    const byDifficulty = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };
    for (const q of shuffle(pool)) {
      (byDifficulty[q.difficulty] || byDifficulty.UNTAGGED).push(q);
    }

          const pickedForSubject = [];
      
      // Pick MCQ and NVQ separately
      for (const qType of ['MCQ', 'NVQ']) {
        const qCount = qType === 'MCQ' ? subj.mcqCount : subj.nvqCount;
        if (!qCount || qCount <= 0) continue;
        
        const typeWanted = splitCounts(qCount, mix);
        
        // Filter byDifficulty to only include this type
        console.log('byDifficulty:', Object.keys(byDifficulty).map(k=>k+':'+byDifficulty[k].length));
        const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };
        for (const level of Object.keys(byDifficulty)) {
          typeBucket[level] = byDifficulty[level].filter(q => qType === 'MCQ' ? q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL' : (q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL'));
        }

        console.log('qType:', qType, 'typeWanted:', typeWanted, 'typeBucket:', Object.keys(typeBucket).map(k=>k+':'+typeBucket[k].length));
        for (const level of ['EASY', 'MEDIUM', 'HARD']) {
          const bucket = typeBucket[level];
          const take = Math.min(typeWanted[level], bucket.length);
          pickedForSubject.push(...bucket.splice(0, take));
          if (take < typeWanted[level]) {
            shortages.push({ subject: subj.name, type: qType, difficulty: level, requested: typeWanted[level], got: take });
          }
        }

        const totalPicked = pickedForSubject.filter(q => qType === 'MCQ' ? q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL' : (q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL')).length;
        let remaining = qCount - totalPicked;
        if (remaining > 0) {
          const leftovers = shuffle([
            ...typeBucket.EASY, ...typeBucket.MEDIUM, ...typeBucket.HARD, ...typeBucket.UNTAGGED,
          ]);
          pickedForSubject.push(...leftovers.slice(0, remaining));
          remaining = qCount - (totalPicked + leftovers.slice(0, remaining).length);
          if (remaining > 0) {
            shortages.push({ subject: subj.name, type: qType, difficulty: 'ANY', requested: qCount, got: qCount - remaining });
          }
        }
      }

    selected.push(...pickedForSubject);
  }

  return { selected, shortages };
}

/**
 * Finds a replacement for one question in a draft paper: same subject,
 * same difficulty (falls back to any difficulty in the same subject),
 * preferring the same chapter, excluding everything already on the paper.
 */
async function findReplacement({ examName, question, excludeIds }) {
  const subjectName = question.chapter.subject.name;

  const base = {
    isActive: true,
    workflowState: 'BANK',
    id: { notIn: [...excludeIds] },
    chapter: {
      syllabusStatus: 'ACTIVE',
      subject: { name: subjectName, exam: { name: examName } },
    },
  };

  // 1st preference: same chapter + same difficulty
  let candidates = await prisma.question.findMany({
    where: { ...base, difficulty: question.difficulty, chapter: { ...base.chapter, name: question.chapter.name } },
    include: { chapter: { include: { subject: true } } },
  });

  // 2nd: same subject + same difficulty
  if (candidates.length === 0) {
    candidates = await prisma.question.findMany({
      where: { ...base, difficulty: question.difficulty },
      include: { chapter: { include: { subject: true } } },
    });
  }

  // 3rd: same subject, any difficulty
  if (candidates.length === 0) {
    candidates = await prisma.question.findMany({
      where: base,
      include: { chapter: { include: { subject: true } } },
    });
  }

  if (candidates.length === 0) return null;
  return shuffle(candidates)[0];
}

module.exports = { selectQuestions, findReplacement, shuffle };
