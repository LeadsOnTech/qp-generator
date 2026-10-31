/**
 * multiSetEngine.js
 *
 * Implements deterministic multi-set exam paper generation (Set A, B, C, D)
 * and synced master answer keys for Indian competitive exams (NEET, JEE, EAPCET).
 *
 * Key Principles:
 * 1. The question pool is identical across all sets.
 * 2. Questions are shuffled deterministically WITHIN each subject and question-type
 *    block (Physics MCQs stay in Physics MCQs, Chemistry NVQs stay in Chemistry NVQs),
 *    preserving the section structure and exam timing.
 * 3. Set A is always the canonical master order. Sets B, C, D use seeded permutations
 *    derived from `paperId + setLabel`, making them 100% reproducible every time.
 * 4. The Master Key syncs all 4 sets into a unified grading matrix for evaluators.
 */

const SET_LABELS = ['A', 'B', 'C', 'D'];

/**
 * Creates a deterministic 32-bit pseudorandom generator from a string seed.
 */
function createSeededRng(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function () {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded Fisher-Yates array shuffle.
 */
function seededShuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates the ordered questions for a given Set (A, B, C, or D).
 *
 * @param {string} paperId
 * @param {Array} baseQuestions - Canonical questions ordered 1..N (Set A)
 * @param {string} set - 'A', 'B', 'C', or 'D'
 * @returns {Array} - Reordered questions with updated order property
 */
function generateSetQuestions(paperId, baseQuestions, set = 'A') {
  const normSet = String(set || 'A').trim().toUpperCase();
  if (!SET_LABELS.includes(normSet) || normSet === 'A') {
    // Set A is canonical
    return baseQuestions.map((q, i) => ({
      ...q,
      order: i + 1,
      setLabel: 'SET A',
    }));
  }

  // Group by Subject and Section Type (MCQ vs NVQ) to maintain exam flow
  const rng = createSeededRng(`${paperId}_SET_${normSet}`);
  const groups = [];
  let currentGroup = null;

  for (const q of baseQuestions) {
    const isNVQ = q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL';
    const groupKey = `${q.subject || 'Default'}_${isNVQ ? 'NVQ' : 'MCQ'}`;
    if (!currentGroup || currentGroup.key !== groupKey) {
      currentGroup = { key: groupKey, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(q);
  }

  // Shuffle within each group deterministically
  const reordered = [];
  let currentOrder = 1;

  for (const g of groups) {
    const shuffledItems = seededShuffle(g.items, rng);
    for (const item of shuffledItems) {
      reordered.push({
        ...item,
        order: currentOrder++,
        setLabel: `SET ${normSet}`,
      });
    }
  }

  return reordered;
}

/**
 * Translates an answer key value to the given option format.
 */
function formatOptionKey(key, optionFormat = 'ALPHA') {
  const k = String(key || '').trim().toUpperCase();
  if (optionFormat === 'NUMERIC') {
    return { A: '1', B: '2', C: '3', D: '4', '1': '1', '2': '2', '3': '3', '4': '4' }[k] || k;
  }
  return { A: 'A', B: 'B', C: 'C', D: 'D', '1': 'A', '2': 'B', '3': 'C', '4': 'D' }[k] || k;
}

/**
 * Builds the complete Synced Master Key matrix across all sets (A, B, C, D).
 *
 * @param {string} paperId
 * @param {Array} baseQuestions - Canonical questions (Set A)
 * @param {string} optionFormat - 'ALPHA' or 'NUMERIC'
 * @returns {Object} - { sets: ['A','B','C','D'], rows: [{ qNumber, keyA, keyB, keyC, keyD, crossRef }] }
 */
function generateMasterKeyMatrix(paperId, baseQuestions, optionFormat = 'ALPHA') {
  const setA = generateSetQuestions(paperId, baseQuestions, 'A');
  const setB = generateSetQuestions(paperId, baseQuestions, 'B');
  const setC = generateSetQuestions(paperId, baseQuestions, 'C');
  const setD = generateSetQuestions(paperId, baseQuestions, 'D');

  const questionCount = baseQuestions.length;
  const rows = [];

  for (let i = 0; i < questionCount; i++) {
    const qNum = i + 1;
    const qA = setA[i];
    const qB = setB[i];
    const qC = setC[i];
    const qD = setD[i];

    // Cross-reference: find where the Set A question at qNum ended up in B, C, D
    const targetId = qA.id;
    const posInB = setB.findIndex((q) => q.id === targetId) + 1;
    const posInC = setC.findIndex((q) => q.id === targetId) + 1;
    const posInD = setD.findIndex((q) => q.id === targetId) + 1;

    rows.push({
      qNumber: qNum,
      // Keys matching question number in each set:
      keyA: formatOptionKey(qA?.correctOption, optionFormat),
      keyB: formatOptionKey(qB?.correctOption, optionFormat),
      keyC: formatOptionKey(qC?.correctOption, optionFormat),
      keyD: formatOptionKey(qD?.correctOption, optionFormat),
      // Cross-reference index for Set A question:
      crossRef: {
        A: qNum,
        B: posInB,
        C: posInC,
        D: posInD,
        key: formatOptionKey(qA?.correctOption, optionFormat),
      },
    });
  }

  return {
    sets: SET_LABELS,
    questionCount,
    rows,
  };
}

module.exports = {
  SET_LABELS,
  generateSetQuestions,
  generateMasterKeyMatrix,
  formatOptionKey,
};
