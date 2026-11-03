// backend/src/lib/resultEngine.js
// Universal Result Evaluation & Ranking Engine
// Supports Online CBT submissions & Offline OMR / CSV / Manual marksheets.

const crypto = require('crypto');
const { gradeMultiCorrect, gradeMatrixMatch, isDecimalCorrect } = require('./gradingEngine');

/**
 * Normalizes an answer string for robust comparison.
 * e.g. "(A)" -> "A", " b " -> "B", "1" -> "A" (when options are 1-4)
 */
function normalizeAnswer(ans) {
  if (ans == null) return null;
  const str = String(ans).trim();
  if (!str) return null;

  // Clean parentheses or brackets: "(A)" -> "A", "[B]" -> "B"
  const clean = str.replace(/[()[\]{}]/g, '').trim().toUpperCase();

  // If numeric 1-4 mapped to A-D for single MCQ
  const numToLetter = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
  if (numToLetter[clean]) return numToLetter[clean];

  return clean;
}

/**
 * Evaluates whether student's answer is correct for a question.
 */
function checkAnswerCorrectness(question, studentRawAnswer) {
  const studentAns = normalizeAnswer(studentRawAnswer);
  if (!studentAns) {
    return { isAttempted: false, isCorrect: false, scoreContribution: 0 };
  }

  const correctOption = normalizeAnswer(question.correctOption);
  const qType = (question.questionType || 'MCQ').toUpperCase();

  // 1. Standard MCQ
  if (qType === 'MCQ' || qType === 'ASSERTION_REASON' || qType === 'STATEMENT_I_II') {
    const isCorrect = studentAns === correctOption;
    return { isAttempted: true, isCorrect, studentAnswer: studentAns, correctOption };
  }

  // 2. Numerical / Integer Type
  if (qType === 'NUMERICAL' || qType === 'INTEGER') {
    const sNum = parseFloat(studentAns);
    const cNum = parseFloat(correctOption);
    if (!isNaN(sNum) && !isNaN(cNum)) {
      const isCorrect = Math.abs(sNum - cNum) < 0.01;
      return { isAttempted: true, isCorrect, studentAnswer: studentAns, correctOption };
    }
    return { isAttempted: true, isCorrect: studentAns.toLowerCase() === correctOption?.toLowerCase(), studentAnswer: studentAns, correctOption };
  }

  // 3. Multi-Correct (JEE Advanced)
  if (qType === 'MULTI_CORRECT') {
    const sArray = studentAns.split(',').map((x) => x.trim()).filter(Boolean);
    const cArray = (correctOption || '').split(',').map((x) => x.trim()).filter(Boolean);
    const mark = gradeMultiCorrect(sArray, cArray);
    return {
      isAttempted: true,
      isCorrect: mark > 0,
      partialScore: mark,
      studentAnswer: studentAns,
      correctOption,
    };
  }

  // Fallback string equality
  const isCorrect = studentAns === correctOption;
  return { isAttempted: true, isCorrect, studentAnswer: studentAns, correctOption };
}

/**
 * Evaluates a single student's answers against paper questions.
 * Handles negative marking, unattempted (0 penalty), subject & chapter breakdowns.
 * 
 * @param {Array} questions - Ordered list of questions with subject and chapter relations.
 * @param {Object} answers - Map of { [questionId]: studentAnswer }
 * @param {Object} markingScheme - { positiveMarks: 4.0, negativeMarks: 1.0 }
 */
function evaluateStudentResult(questions = [], answers = {}, markingScheme = {}) {
  const posMark = markingScheme.positiveMarks != null ? Number(markingScheme.positiveMarks) : 4.0;
  const negMark = markingScheme.negativeMarks != null ? Number(markingScheme.negativeMarks) : 1.0;

  let totalQuestions = questions.length;
  let attemptedQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unattemptedQuestions = 0;
  let totalNegativeDeducted = 0;

  const subjectMap = {};
  const chapterMap = {};
  const itemAnalysis = [];

  questions.forEach((q, idx) => {
    const qId = q.id;
    const subName = q.chapter?.subject?.name || q.subjectName || 'General';
    const chapName = q.chapter?.name || q.chapterName || 'General Topics';

    // Init subject bucket
    if (!subjectMap[subName]) {
      subjectMap[subName] = {
        subjectName: subName,
        totalQuestions: 0,
        attemptedQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
        unattemptedCount: 0,
        maxMarks: 0,
        marksObtained: 0,
        accuracyPercentage: 0,
        percentage: 0,
      };
    }
    subjectMap[subName].totalQuestions++;
    subjectMap[subName].maxMarks += posMark;

    // Init chapter bucket
    if (!chapterMap[chapName]) {
      chapterMap[chapName] = {
        chapterName: chapName,
        totalQuestions: 0,
        attemptedQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
        accuracyPercentage: 0,
        status: 'AVERAGE',
      };
    }
    chapterMap[chapName].totalQuestions++;

    const studentAns = answers[qId];
    const evalData = checkAnswerCorrectness(q, studentAns);

    if (!evalData.isAttempted) {
      unattemptedQuestions++;
      subjectMap[subName].unattemptedCount++;
      itemAnalysis.push({
        id: qId,
        order: q.order || idx + 1,
        subjectName: subName,
        chapterName: chapName,
        questionText: q.questionText,
        correctOption: q.correctOption,
        studentAnswer: null,
        isAttempted: false,
        isCorrect: false,
        marksAwarded: 0,
      });
      return;
    }

    attemptedQuestions++;
    subjectMap[subName].attemptedQuestions++;
    chapterMap[chapName].attemptedQuestions++;

    let marksForQuestion = 0;
    if (evalData.isCorrect) {
      correctAnswers++;
      subjectMap[subName].correctCount++;
      chapterMap[chapName].correctCount++;
      marksForQuestion = evalData.partialScore != null ? evalData.partialScore : posMark;
      subjectMap[subName].marksObtained += marksForQuestion;
    } else {
      incorrectAnswers++;
      subjectMap[subName].incorrectCount++;
      chapterMap[chapName].incorrectCount++;
      const deduction = negMark;
      marksForQuestion = -deduction;
      totalNegativeDeducted += deduction;
      subjectMap[subName].marksObtained -= deduction;
    }

    itemAnalysis.push({
      id: qId,
      order: q.order || idx + 1,
      subjectName: subName,
      chapterName: chapName,
      questionText: q.questionText,
      correctOption: q.correctOption,
      studentAnswer: evalData.studentAnswer,
      isAttempted: true,
      isCorrect: evalData.isCorrect,
      marksAwarded: marksForQuestion,
    });
  });

  const maxMarks = Math.round(totalQuestions * posMark * 100) / 100;
  const rawMarks = (correctAnswers * posMark) - (incorrectAnswers * negMark);
  const marksObtained = Math.round(rawMarks * 100) / 100;

  // Accuracy % = (Correct / Attempted) * 100
  const accuracyPercentage = attemptedQuestions > 0
    ? Math.round((correctAnswers / attemptedQuestions) * 1000) / 10
    : 0.0;

  // Percentage = (Marks Obtained / Max Marks) * 100
  const percentage = maxMarks > 0
    ? Math.round((marksObtained / maxMarks) * 1000) / 10
    : 0.0;

  // Format Subject Summaries
  const subjectResults = Object.values(subjectMap).map((sub) => {
    sub.marksObtained = Math.round(sub.marksObtained * 100) / 100;
    sub.maxMarks = Math.round(sub.maxMarks * 100) / 100;
    sub.accuracyPercentage = sub.attemptedQuestions > 0
      ? Math.round((sub.correctCount / sub.attemptedQuestions) * 1000) / 10
      : 0.0;
    sub.percentage = sub.maxMarks > 0
      ? Math.round((sub.marksObtained / sub.maxMarks) * 1000) / 10
      : 0.0;
    return sub;
  });

  // Format Chapter Summaries & Assign Strong/Average/Weak
  const chapterResults = Object.values(chapterMap).map((chap) => {
    chap.accuracyPercentage = chap.attemptedQuestions > 0
      ? Math.round((chap.correctCount / chap.attemptedQuestions) * 1000) / 10
      : 0.0;

    if (chap.accuracyPercentage >= 75.0) {
      chap.status = 'STRONG';
    } else if (chap.accuracyPercentage >= 50.0) {
      chap.status = 'AVERAGE';
    } else {
      chap.status = 'WEAK';
    }
    return chap;
  });

  // Academic Feedback Insight
  const academicInsight = generateAcademicInsight({
    accuracyPercentage,
    percentage,
    subjectResults,
    chapterResults,
    unattemptedQuestions,
  });

  return {
    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    incorrectAnswers,
    unattemptedQuestions,
    maxMarks,
    marksObtained,
    negativeMarksDeducted: Math.round(totalNegativeDeducted * 100) / 100,
    percentage,
    accuracyPercentage,
    subjectResults,
    chapterResults,
    itemAnalysis,
    academicInsight,
  };
}

/**
 * Generates an automated, constructive academic recommendation.
 */
function generateAcademicInsight({ accuracyPercentage, percentage, subjectResults, chapterResults, unattemptedQuestions }) {
  const weakChapters = chapterResults.filter((c) => c.status === 'WEAK' && c.attemptedQuestions > 0);
  const strongChapters = chapterResults.filter((c) => c.status === 'STRONG');

  const weakSubjects = [...subjectResults].sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);
  const lowestSub = weakSubjects[0];

  let insight = '';

  if (percentage >= 80) {
    insight = `Outstanding performance (${percentage}%). Maintain consistency. `;
    if (weakChapters.length > 0) {
      insight += `Review ${weakChapters[0].chapterName} to eliminate minor negative marks.`;
    } else {
      insight += `Continue practicing high-difficulty Grand Tests for top rank assurance.`;
    }
  } else if (percentage >= 60) {
    insight = `Good solid effort (${percentage}%). `;
    if (accuracyPercentage < 70) {
      insight += `Accuracy is currently ${accuracyPercentage}%. Reduce guessing to save negative marks in ${lowestSub?.subjectName || 'core subjects'}.`;
    } else if (weakChapters.length > 0) {
      insight += `Prioritize revising ${weakChapters.slice(0, 2).map((c) => c.chapterName).join(' & ')} to cross the 75% threshold.`;
    } else {
      insight += `Focus on time management to attempt more questions with high confidence.`;
    }
  } else if (percentage >= 40) {
    insight = `Average performance. Foundational revision needed in ${lowestSub?.subjectName || 'key subjects'}. `;
    if (weakChapters.length > 0) {
      insight += `Targeted practice needed in ${weakChapters[0].chapterName}. Revise formula sheets and solve Level-1 DPPs.`;
    } else {
      insight += `Focus on core concepts and eliminate negative marking on doubtful questions.`;
    }
  } else {
    insight = `Needs immediate attention. Score is ${percentage}% with ${unattemptedQuestions} unattempted questions. `;
    insight += `Schedule dedicated mentor guidance for ${lowestSub?.subjectName || 'fundamental chapters'} and solve basic DPPs.`;
  }

  return insight;
}

/**
 * Calculates deterministic ranks across a cohort of evaluated results.
 * Respects NTA/Standard tie-breaking criteria:
 * 1. Higher Marks Obtained
 * 2. Higher Accuracy Percentage
 * 3. Lesser Negative Marks Deducted
 * 
 * Tied students receive the exact same rank (e.g. 1, 2, 2, 4).
 */
function assignCohortRanks(results = [], examType = 'NEET') {
  if (!results || results.length === 0) return [];

  // Sort cohort
  const sorted = [...results].sort((a, b) => {
    // 1. Higher marks
    if (b.marksObtained !== a.marksObtained) {
      return b.marksObtained - a.marksObtained;
    }
    // 2. Higher accuracy
    if (b.accuracyPercentage !== a.accuracyPercentage) {
      return b.accuracyPercentage - a.accuracyPercentage;
    }
    // 3. Lesser negative marks
    if (a.negativeMarksDeducted !== b.negativeMarksDeducted) {
      return a.negativeMarksDeducted - b.negativeMarksDeducted;
    }
    return 0;
  });

  const totalStudents = sorted.length;
  let currentRank = 1;

  sorted.forEach((item, idx) => {
    if (idx > 0) {
      const prev = sorted[idx - 1];
      const isIdentical =
        item.marksObtained === prev.marksObtained &&
        item.accuracyPercentage === prev.accuracyPercentage &&
        item.negativeMarksDeducted === prev.negativeMarksDeducted;

      if (isIdentical) {
        item.rank = prev.rank;
      } else {
        item.rank = idx + 1;
      }
    } else {
      item.rank = 1;
    }
    item.totalStudents = totalStudents;
  });

  return sorted;
}

/**
 * Generates an unguessable 32-character cryptographic access token.
 */
function generateResultToken() {
  return 'rep_' + crypto.randomBytes(16).toString('hex');
}

module.exports = {
  normalizeAnswer,
  checkAnswerCorrectness,
  evaluateStudentResult,
  generateAcademicInsight,
  assignCohortRanks,
  generateResultToken,
};
