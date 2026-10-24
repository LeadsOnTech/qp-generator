const XLSX = require('xlsx');

// ---------------------------------------------------------------------------
// Phase 1 extraction: TYPED sources only (xlsx / csv / docx).
// Scanned/image PDFs are intentionally NOT supported — this was a deliberate
// decision from planning (OCR introduces error rates we don't want in v1).
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS = [
  'question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctoption',
  'exam', 'subject', 'chapter',
];

const VALID_OPTIONS = ['A', 'B', 'C', 'D'];
const VALID_QUESTION_TYPES = ['MCQ', 'ASSERTION_REASON', 'MATCH_FOLLOWING', 'STATEMENT_I_II', 'NUMERICAL', 'NVQ', 'NVT', 'DIAGRAM_BASED', 'MULTI', 'MATRIX', 'COMPREHENSION', 'DECIMAL'];

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_]+/g, '');
}

/**
 * Parses an .xlsx or .csv buffer into row objects using normalized headers.
 */
function parseSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    return { rows: [], headerMap: {} };
  }

  // Build a normalized-header -> original-header map from the first row's keys
  const originalHeaders = Object.keys(rawRows[0]);
  const headerMap = {};
  originalHeaders.forEach((h) => {
    headerMap[normalizeHeader(h)] = h;
  });

  const rows = rawRows.map((r) => {
    const normalized = {};
    Object.entries(r).forEach(([k, v]) => {
      normalized[normalizeHeader(k)] = typeof v === 'string' ? v.trim() : v;
    });
    return normalized;
  });

  return { rows, headerMap };
}

/**
 * Validates the header row has everything we need before touching any data.
 * Fails fast with a clear message rather than silently misreading columns.
 */
function validateHeaders(headerMap) {
  const missing = REQUIRED_COLUMNS.filter((col) => !(col in headerMap));
  if (missing.length > 0) {
    throw new Error(
      `Missing required column(s): ${missing.join(', ')}. ` +
      `Expected columns (any order): Question, OptionA, OptionB, OptionC, OptionD, ` +
      `CorrectOption, Exam, Subject, Chapter, Topic (optional), QuestionType (optional), ` +
      `Difficulty (optional), Solution (optional), ExamYear (optional), ExamSource (optional), PassageID (optional).`
    );
  }
}

/**
 * Validates and normalizes a single row. Returns { ok, data, errors }.
 * Never throws — row-level problems are collected so one bad row doesn't
 * kill the whole batch (this is the "flag one or two questions" case from planning).
 */
function stripOptionPrefix(text) {
  if (!text) return text;
  const r1 = /^\s*(?:\([1-4a-dA-D]\)\s*)/i;
  const r2 = /^\s*(?:[1-4a-dA-D][\.\)]\s+)/i;
  const r3 = /^\s*(?:[1-4a-dA-D][\.\)])$/i;

  let stripped = text;
  if (r1.test(text)) stripped = text.replace(r1, '');
  else if (r2.test(text)) stripped = text.replace(r2, '');
  else if (r3.test(text)) stripped = text.replace(r3, '');
  
  return stripped.trim() || text.trim();
}

function validateRow(row, rowIndex) {
  const errors = [];

  const questionText = String(row.question || '').trim();
  const optionA = stripOptionPrefix(String(row.optiona || '').trim());
  const optionB = stripOptionPrefix(String(row.optionb || '').trim());
  const optionC = stripOptionPrefix(String(row.optionc || '').trim());
  const optionD = stripOptionPrefix(String(row.optiond || '').trim());
  let correctOption = String(row.correctoption || '').trim().toUpperCase();

  const examName = String(row.exam || '').trim();
  const subjectName = String(row.subject || '').trim();
  const chapterName = String(row.chapter || '').trim();
  const topicName = row.topic ? String(row.topic).trim() : null;
  
  const groupId = row.passageid ? String(row.passageid).trim() : null;

  let questionType = String(row.questiontype || row.type || 'MCQ').trim().toUpperCase();
  if (questionType === 'NVT') questionType = 'NVQ';
  let difficulty = row.difficulty ? String(row.difficulty).trim().toUpperCase() : 'UNTAGGED';
  const imageFilename = (row.imagefilename || row.questionimage || row.image || row.imagefile || row.diagramimage)
    ? String(row.imagefilename || row.questionimage || row.image || row.imagefile || row.diagramimage).trim()
    : null;
  const optionAImage = (row.optionaimage || row.optionimagea || row.imagea || row.optimagea)
    ? String(row.optionaimage || row.optionimagea || row.imagea || row.optimagea).trim()
    : null;
  const optionBImage = (row.optionbimage || row.optionimageb || row.imageb || row.optimageb)
    ? String(row.optionbimage || row.optionimageb || row.imageb || row.optimageb).trim()
    : null;
  const optionCImage = (row.optioncimage || row.optionimagec || row.imagec || row.optimagec)
    ? String(row.optioncimage || row.optionimagec || row.imagec || row.optimagec).trim()
    : null;
  const optionDImage = (row.optiondimage || row.optionimaged || row.imaged || row.optimaged)
    ? String(row.optiondimage || row.optionimaged || row.imaged || row.optimaged).trim()
    : null;
  // Optional worked solution. Accept either "Solution" or "Solutions" as
  // the column header. Blank is fine — that question simply has no
  // solution available to include.
  const solutionText = (row.solution || row.solutions)
    ? String(row.solution || row.solutions).trim()
    : null;

  // PYQ provenance. Accept an explicit "ExamYear" and/or "ExamSource"
  // ("Source" also accepted) column. If ExamYear isn't given but a source
  // label is, try to pull a 4-digit year (19xx/20xx) out of it so older
  // files that only wrote "JEE Main 2024, ..." still get a usable year.
  const examSource = (row.examsource || row.source)
    ? String(row.examsource || row.source).trim()
    : null;
  let examYear = null;
  const rawYear = row.examyear != null ? String(row.examyear).trim() : '';
  if (rawYear && /^\d{4}$/.test(rawYear)) {
    examYear = parseInt(rawYear, 10);
  } else if (examSource) {
    const m = examSource.match(/\b(19|20)\d{2}\b/);
    if (m) examYear = parseInt(m[0], 10);
  }

  if (!questionText) errors.push('Question text is empty');
  
  if (!VALID_QUESTION_TYPES.includes(questionType)) {
    errors.push(`QuestionType "${questionType}" not recognized — defaulting to MCQ`);
    questionType = 'MCQ';
  }

  if (questionType !== 'DECIMAL' && questionType !== 'NUMERICAL' && questionType !== 'NVQ' && questionType !== 'NVT' && questionType !== 'MATRIX' && questionType !== 'COMPREHENSION') {
    if (!optionA || !optionB || !optionC || !optionD) errors.push('One or more options (A-D) are empty');
  }

  if (questionType === 'MULTI') {
    // allow comma separated strings A,B,C,D
    const parts = correctOption.split(',').map(s => s.trim());
    if (parts.length === 0 || parts.some(p => !VALID_OPTIONS.includes(p))) {
      errors.push(`CorrectOption for MULTI must be comma separated A,B,C,D (got "${correctOption}")`);
    }
  } else if (questionType === 'MATRIX') {
    if (!correctOption) {
      errors.push(`CorrectOption for MATRIX must contain relational mapping (got "${correctOption}")`);
    }
  } else if (questionType === 'DECIMAL' || questionType === 'NUMERICAL' || questionType === 'NVQ' || questionType === 'NVT') {
    if (!correctOption) {
      errors.push(`CorrectOption for DECIMAL/NUMERICAL must contain a number or range (got "${correctOption}")`);
    }
  } else {
    if (!VALID_OPTIONS.includes(correctOption)) {
      errors.push(`CorrectOption must be one of A/B/C/D (got "${correctOption || '(empty)'}")`);
    }
  }

  if (!examName) errors.push('Exam is empty');
  if (!subjectName) errors.push('Subject is empty');
  if (!chapterName) errors.push('Chapter is empty');
  if (!['EASY', 'MEDIUM', 'HARD', 'UNTAGGED'].includes(difficulty)) {
    difficulty = 'UNTAGGED';
  }
  if (questionType === 'DIAGRAM_BASED' && !imageFilename) {
    errors.push('QuestionType is Diagram-based but ImageFilename is empty — the question will import without an image; add one later via the Question Bank.');
  }

  return {
    ok: errors.filter((e) => !e.startsWith('QuestionType')).length === 0, // QuestionType-prefixed issues are warnings, not fatal
    rowIndex,
    errors,
    data: {
      questionText, optionA, optionB, optionC, optionD, correctOption,
      examName, subjectName, chapterName, topicName,
      questionType, difficulty, imageFilename,
      optionAImage, optionBImage, optionCImage, optionDImage,
      solutionText, examYear, examSource, groupId,
    },
  };
}

module.exports = {
  parseSpreadsheet,
  validateHeaders,
  validateRow,
  REQUIRED_COLUMNS,
  VALID_QUESTION_TYPES,
};
