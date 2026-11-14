const XLSX = require('xlsx');

// ---------------------------------------------------------------------------
// Phase 1 extraction: TYPED sources only (xlsx / csv / docx).
// Scanned/image PDFs are intentionally NOT supported — this was a deliberate
// decision from planning (OCR introduces error rates we don't want in v1).
// ---------------------------------------------------------------------------

// Core required columns across all questions (MCQ, NVQ, etc.)
const REQUIRED_CORE_COLUMNS = [
  'question', 'correctoption', 'exam', 'subject', 'chapter',
];

// Legacy list of required columns for standard MCQ
const REQUIRED_COLUMNS = [
  'question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctoption', 'exam', 'subject', 'chapter',
];

const VALID_OPTIONS = ['A', 'B', 'C', 'D'];
const VALID_QUESTION_TYPES = ['MCQ', 'ASSERTION_REASON', 'MATCH_FOLLOWING', 'STATEMENT_I_II', 'NUMERICAL', 'NVQ', 'NVT', 'DIAGRAM_BASED', 'MULTI', 'MATRIX', 'COMPREHENSION', 'DECIMAL'];

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_]+/g, '');
}

/**
 * Resolves common column header aliases to their standard normalized keys.
 */
function resolveHeaderAliases(headerMap) {
  if (!('question' in headerMap)) {
    const qKey = ['questiontext', 'problem', 'questionstatement'].find((k) => k in headerMap);
    if (qKey) headerMap['question'] = headerMap[qKey];
  }
  if (!('correctoption' in headerMap)) {
    const aKey = ['correctanswer', 'answer', 'ans', 'numericalanswer', 'value', 'key'].find((k) => k in headerMap);
    if (aKey) headerMap['correctoption'] = headerMap[aKey];
  }
  if (!('exam' in headerMap)) {
    const eKey = ['examname', 'targetexam', 'testname'].find((k) => k in headerMap);
    if (eKey) headerMap['exam'] = headerMap[eKey];
  }
  if (!('subject' in headerMap)) {
    const sKey = ['subjectname'].find((k) => k in headerMap);
    if (sKey) headerMap['subject'] = headerMap[sKey];
  }
  if (!('chapter' in headerMap)) {
    const cKey = ['chaptername', 'unit', 'unitname'].find((k) => k in headerMap);
    if (cKey) headerMap['chapter'] = headerMap[cKey];
  }
  if (!('questiontype' in headerMap)) {
    const tKey = ['type', 'qtype', 'questionformat'].find((k) => k in headerMap);
    if (tKey) headerMap['questiontype'] = headerMap[tKey];
  }
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

  resolveHeaderAliases(headerMap);

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
 * Supports both Multiple Choice Questions (with OptionA-D) and Numerical Value
 * Questions (NVQ, where options are intentionally omitted).
 */
function validateHeaders(headerMap) {
  resolveHeaderAliases(headerMap);

  const missing = REQUIRED_CORE_COLUMNS.filter((col) => !(col in headerMap));
  if (missing.length > 0) {
    throw new Error(
      `Missing required column(s): ${missing.join(', ')}. ` +
      `Expected columns (any order): Question, CorrectOption (or Answer), Exam, Subject, Chapter. ` +
      `For MCQ: OptionA, OptionB, OptionC, OptionD. For NVQ: QuestionType (NVQ).`
    );
  }

  // If some options columns are present, but not all 4, and QuestionType isn't explicitly NVQ:
  const hasSomeOptions = 'optiona' in headerMap || 'optionb' in headerMap || 'optionc' in headerMap || 'optiond' in headerMap;
  const hasQuestionType = 'questiontype' in headerMap;
  if (hasSomeOptions && !hasQuestionType) {
    const missingOptions = ['optiona', 'optionb', 'optionc', 'optiond'].filter((c) => !(c in headerMap));
    if (missingOptions.length > 0) {
      throw new Error(
        `Incomplete options columns: missing ${missingOptions.join(', ')}. Multiple Choice questions require OptionA, OptionB, OptionC, OptionD (or set QuestionType to NVQ).`
      );
    }
  }
}

/**
 * Validates and normalizes a single row. Returns { ok, data, errors }.
 * Never throws — row-level problems are collected so one bad row doesn't
 * kill the whole batch (this is the "flag one or two questions" case from planning).
 */
function normalizeExamName(raw) {
  const norm = String(raw || '').trim();
  const clean = norm.toUpperCase().replace(/[\s_\-]+/g, '');
  if (clean === 'EAPCET' || clean === 'APEAPCET' || clean === 'EAMCET' || clean === 'APEAMCET') {
    return 'AP EAPCET';
  }
  if (clean === 'TGEAPCET' || clean === 'TGEAMCET' || clean === 'TSEAMCET' || clean === 'TSEAPCET' || clean === 'TELANGANAEAPCET') {
    return 'TG EAPCET';
  }
  if (clean === 'KCET' || clean === 'KARNATAKACET') {
    return 'KCET';
  }
  if (clean === 'NEET' || clean === 'NEETUG') {
    return 'NEET';
  }
  if (clean === 'JEE' || clean === 'JEEMAIN' || clean === 'JEEMAINS' || clean === 'JEEMAIN2025' || clean === 'JEEMAINS2025') {
    return 'JEE Main';
  }
  if (clean === 'JEEADV' || clean === 'JEEADVANCED') {
    return 'JEE Advanced';
  }
  return norm;
}

function autoHealMathTypo(text) {
  if (!text || typeof text !== 'string') return text;
  const greekCmds = 'pi|alpha|beta|gamma|theta|lambda|mu|omega|sigma|phi|rho|tau|delta|epsilon|eta|nu|xi|zeta';
  return text.replace(new RegExp('\\\\(' + greekCmds + ')([a-zA-Z])', 'g'), (m, g, v) => '\\' + g + ' ' + v);
}

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

function validateRow(row, rowIndex, hasOptionsInFile = true) {
  const errors = [];

  const rawQuestion = row.question ?? row.questiontext ?? row.problem ?? '';
  const questionText = autoHealMathTypo(String(rawQuestion).trim());

  const optionA = autoHealMathTypo(stripOptionPrefix(String(row.optiona || '').trim()));
  const optionB = autoHealMathTypo(stripOptionPrefix(String(row.optionb || '').trim()));
  const optionC = autoHealMathTypo(stripOptionPrefix(String(row.optionc || '').trim()));
  const optionD = autoHealMathTypo(stripOptionPrefix(String(row.optiond || '').trim()));

  const rawCorrect = row.correctoption ?? row.correctanswer ?? row.answer ?? row.ans ?? row.numericalanswer ?? row.value ?? '';
  let correctOption = String(rawCorrect).trim();

  const rawExam = row.exam ?? row.examname ?? row.targetexam ?? '';
  const examName = normalizeExamName(String(rawExam).trim());

  const rawSubject = row.subject ?? row.subjectname ?? '';
  const subjectName = String(rawSubject).trim();

  const rawChapter = row.chapter ?? row.chaptername ?? row.unit ?? '';
  const chapterName = String(rawChapter).trim();

  const topicName = (row.topic || row.topicname) ? String(row.topic || row.topicname).trim() : null;
  const groupId = row.passageid ? String(row.passageid).trim() : null;

  // Determine question type: if row has no options and no explicit type, default to NVQ
  const hasRowOptions = Boolean(optionA || optionB || optionC || optionD);
  const rawType = row.questiontype ?? row.type ?? row.qtype ?? '';
  let defaultType = (hasRowOptions || hasOptionsInFile) ? 'MCQ' : 'NVQ';
  let questionType = String(rawType || defaultType).trim().toUpperCase();
  if (questionType === 'NVT') questionType = 'NVQ';

  const isNVQ = questionType === 'DECIMAL' || questionType === 'NUMERICAL' || questionType === 'NVQ' || questionType === 'NVT';
  if (!isNVQ && !['MATRIX', 'COMPREHENSION', 'MULTI'].includes(questionType)) {
    correctOption = correctOption.toUpperCase();
  }

  // Auto-heal NVQs where numerical answer was put into OptionA with dummy '-' in other options and marked 'A'
  const hasDummyHyphenOptions = (optionB === '-' || optionB === '') && (optionC === '-' || optionC === '') && (optionD === '-' || optionD === '');
  const looksLikeNVQ = isNVQ || hasDummyHyphenOptions || /_{2,}\.?\s*$/.test(questionText);

  if (looksLikeNVQ) {
    if (['A', 'B', 'C', 'D'].includes(correctOption.toUpperCase())) {
      const optVal = { A: optionA, B: optionB, C: optionC, D: optionD }[correctOption.toUpperCase()] || optionA;
      const cleanVal = String(optVal || '').trim();
      const isNum = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s*(?:to|-)\s*-?\d+(?:\.\d+)?)?$/i.test(cleanVal) || !isNaN(Number(cleanVal)) || /^\d+\/\d+$/.test(cleanVal);
      if (cleanVal && isNum && cleanVal !== '-') {
        correctOption = cleanVal;
        questionType = 'NVQ';
      }
    } else if (hasDummyHyphenOptions && !isNaN(Number(optionA)) && optionA.trim() && !correctOption) {
      correctOption = optionA.trim();
      questionType = 'NVQ';
    }
  }

  let finalOptionA = optionA;
  let finalOptionB = optionB;
  let finalOptionC = optionC;
  let finalOptionD = optionD;

  if (questionType === 'NVQ' || questionType === 'NUMERICAL' || questionType === 'DECIMAL' || questionType === 'NVT') {
    finalOptionA = '';
    finalOptionB = '';
    finalOptionC = '';
    finalOptionD = '';
  }

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

  const solutionText = (row.solution || row.solutions || row.explanation || row.explanations)
    ? autoHealMathTypo(String(row.solution || row.solutions || row.explanation || row.explanations).trim())
    : null;

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
    errors.push(`QuestionType "${questionType}" not recognized — defaulting to ${hasRowOptions ? 'MCQ' : 'NVQ'}`);
    questionType = hasRowOptions ? 'MCQ' : 'NVQ';
  }

  if (!isNVQ && questionType !== 'MATRIX' && questionType !== 'COMPREHENSION') {
    if (!optionA || !optionB || !optionC || !optionD) errors.push('One or more options (A-D) are empty');
  }

  if (questionType === 'MULTI') {
    const parts = correctOption.split(',').map(s => s.trim());
    if (parts.length === 0 || parts.some(p => !VALID_OPTIONS.includes(p))) {
      errors.push(`CorrectOption for MULTI must be comma separated A,B,C,D (got "${correctOption}")`);
    }
  } else if (questionType === 'MATRIX') {
    if (!correctOption) {
      errors.push(`CorrectOption for MATRIX must contain relational mapping (got "${correctOption}")`);
    }
  } else if (isNVQ) {
    if (!correctOption) {
      errors.push(`CorrectOption for NVQ / NUMERICAL must contain a numerical value (got empty)`);
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
      questionText,
      optionA: finalOptionA,
      optionB: finalOptionB,
      optionC: finalOptionC,
      optionD: finalOptionD,
      correctOption,
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
  normalizeExamName,
  REQUIRED_COLUMNS,
  VALID_QUESTION_TYPES,
};
