const crypto = require('crypto');

/**
 * Generates a short, human-friendly access slug for the CBT test link.
 * Example output: "cbt-8k2m9x"
 */
function generateCbtCode() {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz'; // excludes ambiguous chars like 0, 1, l, o
  let code = 'cbt-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generates a 4-digit PIN for PIN-protected tests.
 * Example: "4821"
 */
function generateExamPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Parses raw roster input (comma-separated, newline-separated, or range e.g. "24MPC001..24MPC060")
 * into a clean, normalized array of uppercase roll numbers.
 */
function parseRosterInput(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
  }

  const raw = String(input);
  const items = [];

  // Match range syntax like "24MPC001..24MPC060" or "1..50"
  const lines = raw.split(/[\r\n,;]+/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const rangeMatch = trimmed.match(/^([A-Za-z0-9_-]*?)(\d+)\.\.([A-Za-z0-9_-]*?)(\d+)$/);
    if (rangeMatch) {
      const prefix1 = rangeMatch[1] || '';
      const startNum = parseInt(rangeMatch[2], 10);
      const prefix2 = rangeMatch[3] || '';
      const endNum = parseInt(rangeMatch[4], 10);
      const padLen = rangeMatch[2].length;
      const prefix = prefix1 || prefix2;

      const min = Math.min(startNum, endNum);
      const max = Math.max(startNum, endNum);
      // Safety limit: up to 1000 roll numbers in a single range
      const limit = Math.min(max, min + 999);
      for (let n = min; n <= limit; n++) {
        items.push(`${prefix}${String(n).padStart(padLen, '0')}`.toUpperCase());
      }
    } else {
      items.push(trimmed.toUpperCase());
    }
  }

  // Deduplicate
  return Array.from(new Set(items));
}

/**
 * Strips answers and solutions so student client never receives answer keys ahead of submission.
 */
function sanitizeQuestionsForExam(questions = []) {
  return questions.map((q, idx) => {
    let parsedOptions = [];
    if (Array.isArray(q.options)) {
      parsedOptions = q.options;
    } else if (typeof q.options === 'string') {
      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }
    }

    return {
      id: q.id,
      order: q.order || idx + 1,
      questionText: q.questionText,
      options: parsedOptions,
      questionType: q.questionType || 'MCQ',
      subjectName: q.subject?.name || q.subjectName || null,
      chapterName: q.chapter?.name || q.chapterName || null,
    };
  });
}

/**
 * Evaluates student answers against the paper's actual question keys.
 * Handles both MCQ letter matching (A, B, C, D) and numerical equality.
 */
function evaluateSubmission(questions = [], answers = {}, marking = {}) {
  const positiveMarks = marking.positiveMarks != null ? Number(marking.positiveMarks) : 4.0;
  const negativeMarks = marking.negativeMarks != null ? Number(marking.negativeMarks) : 1.0;

  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const itemDetails = [];

  questions.forEach((q, idx) => {
    const qId = q.id;
    const studentAns = answers[qId] != null ? String(answers[qId]).trim() : null;
    const correctAns = q.correctOption != null ? String(q.correctOption).trim() : null;

    let parsedOptions = [];
    if (Array.isArray(q.options)) {
      parsedOptions = q.options;
    } else if (typeof q.options === 'string') {
      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }
    }

    if (!studentAns) {
      unattemptedCount++;
      itemDetails.push({
        id: qId,
        order: q.order || idx + 1,
        questionText: q.questionText,
        options: parsedOptions,
        studentAnswer: null,
        correctOption: correctAns,
        isCorrect: false,
        isAttempted: false,
        solutionText: q.solutionText || null,
      });
      return;
    }

    // Normalized comparison
    const isMCQ = ['A', 'B', 'C', 'D', '1', '2', '3', '4'].includes(correctAns?.toUpperCase());
    let isCorrect = false;

    if (isMCQ) {
      const normStudent = studentAns.toUpperCase().replace(/[()]/g, '');
      const normCorrect = correctAns.toUpperCase().replace(/[()]/g, '');
      isCorrect = (normStudent === normCorrect);
    } else {
      // Numerical or decimal comparison
      const studentNum = parseFloat(studentAns);
      const correctNum = parseFloat(correctAns);
      if (!isNaN(studentNum) && !isNaN(correctNum)) {
        isCorrect = Math.abs(studentNum - correctNum) < 0.01;
      } else {
        isCorrect = studentAns.toLowerCase() === correctAns.toLowerCase();
      }
    }

    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    itemDetails.push({
      id: qId,
      order: q.order || idx + 1,
      questionText: q.questionText,
      options: parsedOptions,
      studentAnswer: studentAns,
      correctOption: correctAns,
      isCorrect,
      isAttempted: true,
      solutionText: q.solutionText || null,
    });
  });

  const rawScore = (correctCount * positiveMarks) - (incorrectCount * negativeMarks);
  const score = Math.round(rawScore * 100) / 100;
  const maxScore = questions.length * positiveMarks;
  const attemptedCount = correctCount + incorrectCount;
  const accuracyPercentage = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 1000) / 10 : 0;

  return {
    score,
    maxScore,
    correctCount,
    incorrectCount,
    unattemptedCount,
    accuracyPercentage,
    itemDetails,
  };
}

/**
 * Builds a sorted leaderboard with verified student ranks and quarantined guest entries.
 */
function buildLeaderboard(submissions = [], questions = []) {
  const verifiedList = [];
  const quarantinedList = [];

  submissions.forEach((sub) => {
    const item = {
      id: sub.id,
      studentName: sub.studentName,
      rollNumber: sub.rollNumber,
      section: sub.section,
      score: sub.score,
      maxScore: sub.maxScore,
      correctCount: sub.correctCount,
      incorrectCount: sub.incorrectCount,
      unattemptedCount: sub.unattemptedCount,
      accuracyPercentage: sub.accuracyPercentage,
      timeSpentSeconds: sub.timeSpentSeconds,
      tabSwitchCount: sub.tabSwitchCount,
      submittedAt: sub.submittedAt,
      isVerifiedStudent: sub.isVerifiedStudent,
    };

    if (sub.isVerifiedStudent) {
      verifiedList.push(item);
    } else {
      quarantinedList.push(item);
    }
  });

  // Sort verified submissions by:
  // 1. Higher score
  // 2. Higher accuracy
  // 3. Lower time spent
  verifiedList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracyPercentage !== a.accuracyPercentage) return b.accuracyPercentage - a.accuracyPercentage;
    return a.timeSpentSeconds - b.timeSpentSeconds;
  });

  // Assign ranks
  let currentRank = 1;
  verifiedList.forEach((student, idx) => {
    if (idx > 0) {
      const prev = verifiedList[idx - 1];
      if (student.score === prev.score && student.accuracyPercentage === prev.accuracyPercentage && student.timeSpentSeconds === prev.timeSpentSeconds) {
        student.rank = prev.rank;
      } else {
        student.rank = idx + 1;
      }
    } else {
      student.rank = 1;
    }
  });

  // Class aggregates
  const totalVerified = verifiedList.length;
  const totalScores = verifiedList.reduce((acc, s) => acc + s.score, 0);
  const averageScore = totalVerified > 0 ? Math.round((totalScores / totalVerified) * 10) / 10 : 0;
  const topScore = totalVerified > 0 ? verifiedList[0].score : 0;

  return {
    verifiedList,
    quarantinedList,
    totalVerified,
    totalQuarantined: quarantinedList.length,
    averageScore,
    topScore,
  };
}

module.exports = {
  generateCbtCode,
  generateExamPin,
  parseRosterInput,
  sanitizeQuestionsForExam,
  evaluateSubmission,
  buildLeaderboard,
};
