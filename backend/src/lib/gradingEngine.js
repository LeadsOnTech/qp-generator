/**
 * JEE Advanced Grading Engine
 *
 * This utility provides standalone evaluation functions for the complex
 * question types used in JEE Advanced examinations. Designed to be
 * consumed by the CBT (Computer Based Test) module in future phases.
 */

function gradeMultiCorrect(studentSelection, correctOptions) {
  if (!studentSelection || studentSelection.length === 0) return 0;
  let allCorrectSelected = true, partialCorrectCount = 0, hasIncorrect = false;
  for (const sel of studentSelection) {
    if (correctOptions.includes(sel)) partialCorrectCount++;
    else hasIncorrect = true;
  }
  for (const opt of correctOptions) {
    if (!studentSelection.includes(opt)) allCorrectSelected = false;
  }
  if (hasIncorrect) return -1;
  if (allCorrectSelected) return 4;
  return partialCorrectCount;
}

function gradeMatrixMatch(studentMapping, correctMapping) {
  if (!studentMapping || Object.keys(studentMapping).length === 0) return 0;
  let score = 0;
  for (const [rowKey, correctTargets] of Object.entries(correctMapping)) {
    const studentTargets = studentMapping[rowKey] || [];
    const isCorrect = studentTargets.length === correctTargets.length &&
                      studentTargets.every(t => correctTargets.includes(t)) &&
                      correctTargets.every(t => studentTargets.includes(t));
    if (isCorrect && studentTargets.length > 0) score += 1;
  }
  return score;
}

function isDecimalCorrect(studentValue, correctRangeStr) {
  if (studentValue === undefined || studentValue === null) return false;
  const cleanStr = correctRangeStr.trim();
  const rangeMatch = cleanStr.match(/^\[(.*),(.*)\]$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].trim());
    const max = parseFloat(rangeMatch[2].trim());
    return studentValue >= min && studentValue <= max;
  }
  const exactValue = parseFloat(cleanStr);
  return Math.abs(studentValue - exactValue) < 0.000001;
}

module.exports = { gradeMultiCorrect, gradeMatrixMatch, isDecimalCorrect };
