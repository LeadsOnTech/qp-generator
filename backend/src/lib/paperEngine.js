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
        const aliasList = [entry.chapter];
        const entryLow = entry.chapter.toLowerCase().trim();
        if (entryLow === 'kinetic theory of gases' || entryLow === 'kinetic theory') {
          aliasList.push('Kinetic Theory of Gases', 'Kinetic Theory');
        }
        if (entryLow === 'laws of motion' || entryLow === 'friction') {
          aliasList.push('Laws of Motion', 'Friction');
        }
        const cond = { chapter: { name: { in: aliasList } } };
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

function isChapterMatch(qChapterName, targetChapterName) {
  if (!qChapterName || !targetChapterName) return false;
  const a = qChapterName.toLowerCase().trim();
  const b = targetChapterName.toLowerCase().trim();
  if (a === b) return true;
  if ((a === 'kinetic theory' || a === 'kinetic theory of gases') && (b === 'kinetic theory' || b === 'kinetic theory of gases')) return true;
  if ((a === 'laws of motion' || a === 'friction') && (b === 'laws of motion' || b === 'friction')) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

/**
 * Classifies an MCQ question into its pedagogical model category:
 *   - 'STATEMENT': Statement I & II, Given two statements
 *   - 'ASSERTION_REASON': Assertion and Reason
 *   - 'MATCH': Match List-I with List-II
 *   - 'DIAGRAM': Has attached diagram or figure reference
 *   - 'NUMERICAL_PROBLEM': Mathematical problem, calculations, formulas, values
 *   - 'THEORY_CONCEPTUAL': Theory, definitions, laws, principles, qualitative concepts
 */
function classifyQuestionModel(q) {
  if (!q) return 'THEORY_CONCEPTUAL';
  const text = (q.questionText || '').trim();
  const optA = (q.optionA || '').trim();
  const optB = (q.optionB || '').trim();
  const optC = (q.optionC || '').trim();
  const optD = (q.optionD || '').trim();

  // 1. Structural Question Formats
  if (
    q.questionType === 'STATEMENT_I_II' ||
    /statement\s*[-–—:]?\s*(i|1|two statements)/i.test(text) ||
    /given below are two statements/i.test(text)
  ) {
    return 'STATEMENT';
  }

  if (
    q.questionType === 'ASSERTION_REASON' ||
    (/\bassertion\b/i.test(text) && /\breason\b/i.test(text)) ||
    /\(a\)\s*assertion/i.test(text)
  ) {
    return 'ASSERTION_REASON';
  }

  if (
    q.questionType === 'MATCH_FOLLOWING' ||
    /match\s+(list|column)/i.test(text) ||
    /(list|column)\s*[-–—:]?\s*(i|1).*(list|column)\s*[-–—:]?\s*(ii|2)/i.test(text)
  ) {
    return 'MATCH';
  }

  if (q.imageFilename || q.optionAImage || q.optionBImage || q.optionCImage || q.optionDImage) {
    return 'DIAGRAM';
  }

  // 2. Numerical / Problem vs Theory / Conceptual
  const numericOptionRegex = /^[\s$]*[±\-+]?\s*\d+(\.\d+)?(\s*[xX*×]\s*10\^?[\-+]?\d+)?\s*([a-zA-ZΩμ°%/\-]+[\-0-9^]*)?[\s$]*$/;
  let numericOptionsCount = 0;
  for (const opt of [optA, optB, optC, optD]) {
    if (opt && (numericOptionRegex.test(opt) || /\b\d+(\.\d+)?\s*(kj|j|mol|kg|g|m|cm|mm|s|ms|k|v|mv|w|kw|pa|atm|hz|ev|rad|°c|k\b|ω|ohm)\b/i.test(opt))) {
      numericOptionsCount++;
    }
  }

  const hasMathKeywords = /\b(calculate|find the value|evaluate|determine the|magnitude of|ratio of|equals|is equal to|work done|velocity of|acceleration|frequency of|wavelength|resistance|enthalpy|molecular mass|mass of|volume of|moles of|percentage of|integrate|derivative|radius of|capacitance|inductance|half-life|emf|potential difference|current in|power in|energy of|pressure of|temperature of|charge on)\b/i.test(text);
  const hasFormulaSigns = /[\d=+\-*/^√∑∫π]/.test(text) && /\d+/.test(text);

  if (numericOptionsCount >= 2 || (numericOptionsCount >= 1 && hasMathKeywords)) {
    return 'NUMERICAL_PROBLEM';
  }

  if (hasMathKeywords && hasFormulaSigns && /\d+/.test(text)) {
    return 'NUMERICAL_PROBLEM';
  }

  return 'THEORY_CONCEPTUAL';
}

function isDiagramQuestion(q) {
  if (!q) return false;
  return Boolean(
    q.imageFilename ||
    q.optionAImage ||
    q.optionBImage ||
    q.optionCImage ||
    q.optionDImage ||
    q.questionType === 'DIAGRAM_BASED'
  );
}

/**
 * Given a list of candidate questions, selects `k` questions ensuring
 * a balanced mix of Theory, Calculation Problems, Statements, and Diagrams.
 */
function pickDiverseModelQuestions(candidates, k, modelMix = 'BALANCED', diagramPreference = 'BALANCED') {
  if (!candidates || candidates.length === 0 || k <= 0) return [];
  if (candidates.length <= k) return shuffle(candidates);

  // 1. Explicit Diagram Preferences
  if (diagramPreference === 'ONLY_DIAGRAMS' || modelMix === 'DIAGRAMS_ONLY') {
    const diagrams = candidates.filter(isDiagramQuestion);
    if (diagrams.length >= k) {
      return shuffle(diagrams).slice(0, k);
    }
    const nonDiagrams = candidates.filter((q) => !isDiagramQuestion(q));
    return shuffle([...diagrams, ...shuffle(nonDiagrams).slice(0, k - diagrams.length)]);
  }

  if (diagramPreference === 'PREFER_DIAGRAMS') {
    const diagrams = candidates.filter(isDiagramQuestion);
    const nonDiagrams = candidates.filter((q) => !isDiagramQuestion(q));
    const targetDiagrams = Math.min(diagrams.length, Math.max(1, Math.round(k * 0.5)));
    const pickedDiagrams = shuffle(diagrams).slice(0, targetDiagrams);
    const needRest = k - pickedDiagrams.length;
    const pickedRest = pickDiverseModelQuestions(nonDiagrams, needRest, modelMix, 'BALANCED');
    return shuffle([...pickedDiagrams, ...pickedRest]);
  }

  if (diagramPreference === 'NO_DIAGRAMS') {
    const noDiag = candidates.filter((q) => !isDiagramQuestion(q));
    if (noDiag.length >= k) return shuffle(noDiag).slice(0, k);
    return shuffle(candidates).slice(0, k);
  }

  const buckets = {
    NUMERICAL_PROBLEM: [],
    THEORY_CONCEPTUAL: [],
    SPECIAL_FORMAT: [], // Statements, Assertion-Reason, Match, Diagrams
  };

  for (const q of shuffle(candidates)) {
    const m = classifyQuestionModel(q);
    if (m === 'NUMERICAL_PROBLEM') {
      buckets.NUMERICAL_PROBLEM.push(q);
    } else if (m === 'THEORY_CONCEPTUAL') {
      buckets.THEORY_CONCEPTUAL.push(q);
    } else {
      buckets.SPECIAL_FORMAT.push(q);
    }
  }

  if (modelMix === 'THEORY_ONLY') {
    const primary = [...buckets.THEORY_CONCEPTUAL, ...buckets.SPECIAL_FORMAT];
    const take = primary.slice(0, k);
    if (take.length < k) {
      take.push(...buckets.NUMERICAL_PROBLEM.slice(0, k - take.length));
    }
    return shuffle(take);
  }

  if (modelMix === 'PROBLEMS_ONLY') {
    const primary = [...buckets.NUMERICAL_PROBLEM];
    const take = primary.slice(0, k);
    if (take.length < k) {
      const rest = [...buckets.SPECIAL_FORMAT, ...buckets.THEORY_CONCEPTUAL];
      take.push(...rest.slice(0, k - take.length));
    }
    return shuffle(take);
  }

  if (modelMix === 'ANY') {
    return shuffle(candidates).slice(0, k);
  }

  // DEFAULT: BALANCED DIVERSE MIX
  const availableKeys = Object.keys(buckets).filter((key) => buckets[key].length > 0);
  if (availableKeys.length <= 1) {
    return shuffle(candidates).slice(0, k);
  }

  let targetCounts = {};
  if (buckets.NUMERICAL_PROBLEM.length > 0 && buckets.THEORY_CONCEPTUAL.length > 0) {
    if (buckets.SPECIAL_FORMAT.length > 0) {
      const specialQuota = Math.max(1, Math.round(k * 0.15));
      const rem = k - specialQuota;
      const probQuota = Math.round(rem * 0.52);
      const theoryQuota = rem - probQuota;
      targetCounts = {
        NUMERICAL_PROBLEM: probQuota,
        THEORY_CONCEPTUAL: theoryQuota,
        SPECIAL_FORMAT: specialQuota,
      };
    } else {
      const probQuota = Math.round(k * 0.5);
      const theoryQuota = k - probQuota;
      targetCounts = {
        NUMERICAL_PROBLEM: probQuota,
        THEORY_CONCEPTUAL: theoryQuota,
        SPECIAL_FORMAT: 0,
      };
    }
  } else {
    const totalAvail = availableKeys.reduce((sum, key) => sum + buckets[key].length, 0);
    let assigned = 0;
    availableKeys.forEach((key, idx) => {
      if (idx === availableKeys.length - 1) {
        targetCounts[key] = k - assigned;
      } else {
        const q = Math.round((buckets[key].length / totalAvail) * k);
        targetCounts[key] = q;
        assigned += q;
      }
    });
  }

  const picked = [];
  const leftovers = [];

  for (const key of ['NUMERICAL_PROBLEM', 'THEORY_CONCEPTUAL', 'SPECIAL_FORMAT']) {
    const bucket = buckets[key];
    const target = targetCounts[key] || 0;
    const take = Math.min(target, bucket.length);
    picked.push(...bucket.slice(0, take));
    leftovers.push(...bucket.slice(take));
  }

  let remainingNeeded = k - picked.length;
  if (remainingNeeded > 0) {
    const shuffledLeftovers = shuffle(leftovers);
    picked.push(...shuffledLeftovers.slice(0, remainingNeeded));
  }

  return shuffle(picked);
}

/**
 * Smoothly interleaves question models across a paper section (e.g. Physics)
 * so students don't encounter 10 calculation problems in a row or 10 pure memory items in a row.
 */
function interleaveQuestionModels(questions = []) {
  if (!questions || questions.length <= 2) return questions;

  const buckets = {
    NUMERICAL_PROBLEM: [],
    THEORY_CONCEPTUAL: [],
    SPECIAL: [],
  };

  for (const q of shuffle(questions)) {
    const m = classifyQuestionModel(q);
    if (m === 'NUMERICAL_PROBLEM') buckets.NUMERICAL_PROBLEM.push(q);
    else if (m === 'THEORY_CONCEPTUAL') buckets.THEORY_CONCEPTUAL.push(q);
    else buckets.SPECIAL.push(q);
  }

  const result = [];
  const activeKeys = ['NUMERICAL_PROBLEM', 'THEORY_CONCEPTUAL', 'SPECIAL'].filter((k) => buckets[k].length > 0);

  while (result.length < questions.length) {
    let added = false;
    for (const k of activeKeys) {
      if (buckets[k].length > 0) {
        result.push(buckets[k].pop());
        added = true;
      }
    }
    if (!added) break;
  }

  return result;
}

/**
 * Selects questions for a paper request. Returns:
 *   { selected: [question...], shortages: [{subject, difficulty, requested, got}] }
 */
async function selectQuestions(request) {
  const { examName, subjects, chapters = [], difficultyMix, avoidRepeats = true, modelMix = 'BALANCED', diagramPreference = 'BALANCED' } = request;
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

    // Safety net against duplicate uploads & dummy placeholder rows
    const seenText = new Set();
    const placeholderRegex = /\b(placeholder|todo|tbd|xxx|lorem ipsum)\b/i;
    let pool = [];
    for (const q of rawPool) {
      if (placeholderRegex.test(q.questionText || '')) continue;
      const key = (q.questionText || '').trim().toLowerCase();
      if (key && seenText.has(key)) continue;
      seenText.add(key);
      pool.push(q);
    }

    if (diagramPreference === 'ONLY_DIAGRAMS' || modelMix === 'DIAGRAMS_ONLY') {
      const diagramPool = pool.filter(isDiagramQuestion);
      if (diagramPool.length > 0) {
        // Place diagram questions first so they are picked with top priority
        const nonDiagramPool = pool.filter((q) => !isDiagramQuestion(q));
        pool = [...diagramPool, ...nonDiagramPool];
      }
    } else if (diagramPreference === 'NO_DIAGRAMS') {
      pool = pool.filter((q) => !isDiagramQuestion(q));
    }

    const pickedForSubject = [];
    const usedInSubject = new Set();

    // 1. Chapter-level weighted distribution (Blueprint Presets mode)
    if (subj.chapterDistribution && Array.isArray(subj.chapterDistribution) && subj.chapterDistribution.length > 0) {
      for (const dist of subj.chapterDistribution) {
        const targetChapter = dist.chapter;
        const targetCount = dist.count || (dist.mcqCount || 0) + (dist.nvqCount || 0);
        if (!targetCount || targetCount <= 0) continue;

        const chapterCandidates = pool.filter(
          (q) => !usedInSubject.has(q.id) && isChapterMatch(q.chapter?.name, targetChapter)
        );

        const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };
        for (const q of shuffle(chapterCandidates)) {
          (typeBucket[q.difficulty] || typeBucket.UNTAGGED).push(q);
        }

        const typeWanted = splitCounts(targetCount, mix);
        let chapterPicked = 0;

        for (const level of ['EASY', 'MEDIUM', 'HARD']) {
          const bucket = typeBucket[level];
          const take = Math.min(typeWanted[level], bucket.length);
          if (take > 0) {
            const pickedDiverse = pickDiverseModelQuestions(bucket, take, modelMix, diagramPreference);
            for (const q of pickedDiverse) {
              pickedForSubject.push(q);
              usedInSubject.add(q.id);
              chapterPicked++;
              const bIdx = bucket.findIndex((b) => b.id === q.id);
              if (bIdx !== -1) bucket.splice(bIdx, 1);
            }
          }
        }

        // If targetCount still not reached from this chapter, take remaining from untagged or any difficulty
        if (chapterPicked < targetCount) {
          const leftovers = [
            ...typeBucket.EASY, ...typeBucket.MEDIUM, ...typeBucket.HARD, ...typeBucket.UNTAGGED,
          ];
          const need = targetCount - chapterPicked;
          const take = Math.min(need, leftovers.length);
          if (take > 0) {
            const pickedDiverse = pickDiverseModelQuestions(leftovers, take, modelMix, diagramPreference);
            for (const q of pickedDiverse) {
              pickedForSubject.push(q);
              usedInSubject.add(q.id);
              chapterPicked++;
            }
          }
        }

        if (chapterPicked < targetCount) {
          shortages.push({
            subject: subj.name,
            chapter: targetChapter,
            difficulty: 'WEIGHTAGE_TARGET',
            requested: targetCount,
            got: chapterPicked,
          });
        }
      }

      // Check if total questions picked for subject reached requested total (subj.mcqCount + subj.nvqCount)
      const wantedTotal = (subj.mcqCount || 0) + (subj.nvqCount || 0);
      let subjectRemaining = wantedTotal - pickedForSubject.length;
      if (subjectRemaining > 0) {
        const remainingPool = pool.filter((q) => !usedInSubject.has(q.id));
        const take = Math.min(subjectRemaining, remainingPool.length);
        if (take > 0) {
          const pickedDiverse = pickDiverseModelQuestions(remainingPool, take, modelMix, diagramPreference);
          for (const q of pickedDiverse) {
            pickedForSubject.push(q);
            usedInSubject.add(q.id);
          }
          subjectRemaining -= take;
        }
        if (subjectRemaining > 0) {
          shortages.push({
            subject: subj.name,
            difficulty: 'SUBJECT_TOTAL',
            requested: wantedTotal,
            got: pickedForSubject.length,
          });
        }
      }
    } else {
      // 2. Standard / legacy flat distribution
      const byDifficulty = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };
      for (const q of shuffle(pool)) {
        (byDifficulty[q.difficulty] || byDifficulty.UNTAGGED).push(q);
      }

      // Pick MCQ and NVQ separately
      for (const qType of ['MCQ', 'NVQ']) {
        const qCount = qType === 'MCQ' ? subj.mcqCount : subj.nvqCount;
        if (!qCount || qCount <= 0) continue;

        const typeWanted = splitCounts(qCount, mix);

        // Filter byDifficulty to only include this type
        const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };
        for (const level of Object.keys(byDifficulty)) {
          typeBucket[level] = byDifficulty[level].filter((q) =>
            qType === 'MCQ'
              ? q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL'
              : q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL'
          );
        }

        for (const level of ['EASY', 'MEDIUM', 'HARD']) {
          const bucket = typeBucket[level];
          const take = Math.min(typeWanted[level], bucket.length);
          if (take > 0) {
            const pickedDiverse = qType === 'MCQ'
              ? pickDiverseModelQuestions(bucket, take, modelMix, diagramPreference)
              : (diagramPreference === 'ONLY_DIAGRAMS' && bucket.some(isDiagramQuestion))
                ? [...bucket.filter(isDiagramQuestion), ...bucket.filter((q) => !isDiagramQuestion(q))].slice(0, take)
                : bucket.slice(0, take);
            pickedForSubject.push(...pickedDiverse);
            const pickedSet = new Set(pickedDiverse.map((p) => p.id));
            typeBucket[level] = bucket.filter((b) => !pickedSet.has(b.id));
          }
          if (take < typeWanted[level]) {
            shortages.push({ subject: subj.name, type: qType, difficulty: level, requested: typeWanted[level], got: take });
          }
        }

        const totalPicked = pickedForSubject.filter((q) =>
          qType === 'MCQ'
            ? q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL'
            : q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL'
        ).length;
        let remaining = qCount - totalPicked;
        if (remaining > 0) {
          const leftovers = [
            ...typeBucket.EASY, ...typeBucket.MEDIUM, ...typeBucket.HARD, ...typeBucket.UNTAGGED,
          ];
          const take = Math.min(remaining, leftovers.length);
          if (take > 0) {
            const pickedDiverse = qType === 'MCQ'
              ? pickDiverseModelQuestions(leftovers, take, modelMix, diagramPreference)
              : (diagramPreference === 'ONLY_DIAGRAMS' && leftovers.some(isDiagramQuestion))
                ? [...leftovers.filter(isDiagramQuestion), ...leftovers.filter((q) => !isDiagramQuestion(q))].slice(0, take)
                : leftovers.slice(0, take);
            pickedForSubject.push(...pickedDiverse);
            remaining -= take;
          }
          if (remaining > 0) {
            shortages.push({ subject: subj.name, type: qType, difficulty: 'ANY', requested: qCount, got: qCount - remaining });
          }
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

  // Prefer a candidate matching the original question's model category (e.g. Problem vs Theory vs Statement)
  const targetModel = classifyQuestionModel(question);
  const sameModel = candidates.filter((c) => classifyQuestionModel(c) === targetModel);
  if (sameModel.length > 0) {
    return shuffle(sameModel)[0];
  }

  return shuffle(candidates)[0];
}

module.exports = {
  selectQuestions,
  findReplacement,
  shuffle,
  classifyQuestionModel,
  interleaveQuestionModels,
  pickDiverseModelQuestions,
};
