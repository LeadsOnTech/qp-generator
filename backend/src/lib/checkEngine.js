// ---------------------------------------------------------------------------
// Phase 4 — Subject-specialist checking agents.
//
// Five specialists (Physics, Chemistry, Biology, Reasoning, English) each run
// their own checks on a question, plus every question gets the shared
// structural checks regardless of subject. Two modes, same pattern as
// Phase 2's tagging engine:
//   1. CLAUDE mode  — if ANTHROPIC_API_KEY is set, sends batches to Claude
//                     with a subject-specific reviewer persona.
//   2. RULE_BASED   — free, offline, transparent. Runs today at zero cost.
//
// Nothing is ever auto-deleted. A FLAGGED question stays in the bank but is
// excluded from paper generation until a human Approves (keep as-is) or
// Removes it — mirroring the "flag, don't auto-remove" principle from the
// original product plan.
// ---------------------------------------------------------------------------

const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 12;

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

function isNVQQuestion(q) {
  if (!q) return false;
  const qType = String(q.questionType || '').trim().toUpperCase();
  if (['NVQ', 'NUMERICAL', 'DECIMAL', 'NVT'].includes(qType)) return true;
  const hasOptions = q.options && Object.values(q.options).some((v) => v && String(v).trim().length > 0);
  if (!hasOptions && q.correctOption && !['A', 'B', 'C', 'D'].includes(String(q.correctOption).trim().toUpperCase())) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Shared structural checks — apply to every question regardless of subject.
// These are simple, deterministic, and catch the most common data-entry
// mistakes (the "small small mistakes" mentioned in planning).
// ---------------------------------------------------------------------------
function structuralChecks(q) {
  const issues = [];
  const isNVQ = isNVQQuestion(q);
  const opts = OPTION_KEYS.map((k) => (q.options ? q.options[k] || '' : '').trim());

  if (isNVQ) {
    // For Numerical Value Questions (NVQ):
    // Options are intentionally omitted — validate the numerical answer
    const ans = String(q.correctOption || '').trim();
    if (!ans) {
      issues.push('Numerical answer is empty for this question.');
    } else {
      // Must be a valid integer, decimal, negative number, scientific notation, or standard range
      const isNumeric = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:\s*(?:to|-)\s*-?\d+(?:\.\d+)?)?$/i.test(ans) || !isNaN(Number(ans));
      if (!isNumeric) {
        issues.push(`Numerical answer "${ans}" is not a valid number or range.`);
      }
    }
  } else {
    // For Standard Multiple Choice Questions:
    if (opts.some((o) => o.length === 0)) {
      issues.push('One or more options is empty.');
    }
    const lower = opts.map((o) => o.toLowerCase());
    const duplicates = lower.filter((o, i) => o && lower.indexOf(o) !== i);
    if (duplicates.length > 0) {
      issues.push('Two options have identical text.');
    }
    const cleanCorrect = String(q.correctOption || '').trim().toUpperCase();
    if (!OPTION_KEYS.includes(cleanCorrect)) {
      issues.push(`CorrectOption "${q.correctOption}" is not A/B/C/D.`);
    }
  }

  if ((q.questionText || '').trim().length < 8) {
    issues.push('Question text looks too short to be a real question.');
  }
  const placeholderPattern = /\b(todo|tbd|xxx|lorem ipsum|placeholder)\b/i;
  if (placeholderPattern.test(q.questionText) || (!isNVQ && opts.some((o) => placeholderPattern.test(o)))) {
    issues.push('Contains placeholder text (e.g. "TODO", "xxx").');
  }
  if (/\s{2,}/.test(q.questionText)) {
    issues.push('Question text has doubled-up spacing (possible OCR/typing artifact).');
  }

  return issues;
}

// A very small set of well-known unit suffixes, used only to catch a
// question where one option carries a unit the others don't (a classic
// typo signal), not to validate physics correctness itself.
const UNIT_PATTERN = /\b(m|cm|mm|km|kg|g|s|hz|n|j|w|v|a|ohm|pa|mol|k|°c|°k)\b\.?$/i;

function physicsChecks(q) {
  const issues = [];
  const isNVQ = isNVQQuestion(q);
  if (isNVQ) {
    const mentionsCalculate = /\b(calculate|find the|determine)\b/i.test(q.questionText);
    const hasNumAnswer = /\d/.test(String(q.correctOption || ''));
    if (mentionsCalculate && !hasNumAnswer) {
      issues.push('Question asks to calculate/find a value, but marked numerical answer contains no number.');
    }
    return issues;
  }

  const opts = OPTION_KEYS.map((k) => (q.options ? q.options[k] || '' : ''));
  const withUnit = opts.map((o) => UNIT_PATTERN.test(o.trim()));
  const unitCount = withUnit.filter(Boolean).length;
  if (unitCount > 0 && unitCount < 4) {
    issues.push('Some options carry a unit and others don\'t — check for a typo (e.g. a missing "m" or "s").');
  }
  const mentionsCalculate = /\b(calculate|find the|determine)\b/i.test(q.questionText);
  const anyNumericOption = opts.some((o) => /\d/.test(o));
  if (mentionsCalculate && !anyNumericOption) {
    issues.push('Question asks to calculate/find a value, but no option contains a number.');
  }
  return issues;
}

function chemistryChecks(q) {
  const issues = [];
  const isNVQ = isNVQQuestion(q);
  const optsText = (isNVQ || !q.options) ? '' : OPTION_KEYS.map((k) => q.options[k] || '').join(' ');
  const text = q.questionText + (optsText ? ' ' + optsText : '');
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push('Unbalanced parentheses in question or options (possible formula typo).');
  }
  return issues;
}

// Deliberately tiny reference set — a handful of very well-known NCERT facts,
// used only to catch an obviously wrong marked answer on a well-known
// question. This is a pattern check, not a knowledge base, and stays
// conservative to avoid false positives.
const BIOLOGY_KNOWN_FACTS = [
  { pattern: /powerhouse of the cell/i, expectedOptionText: /mitochondria/i },
  { pattern: /site of protein synthesis/i, expectedOptionText: /ribosome/i },
  { pattern: /basic unit of classification/i, expectedOptionText: /species/i },
];

function biologyChecks(q) {
  const issues = [];
  if (isNVQQuestion(q)) return issues;
  for (const fact of BIOLOGY_KNOWN_FACTS) {
    if (fact.pattern.test(q.questionText)) {
      const correctText = (q.options ? q.options[q.correctOption] : '') || '';
      if (!fact.expectedOptionText.test(correctText)) {
        issues.push(`This looks like a well-known fact question, but the marked answer ("${correctText}") doesn't match the commonly known answer — please double-check.`);
      }
    }
  }
  return issues;
}

function reasoningChecks(q) {
  const issues = [];
  if (q.questionType === 'ASSERTION_REASON') {
    const opts = OPTION_KEYS.map((k) => (q.options[k] || '').toLowerCase());
    const standardPhrasing = [
      /both.*true.*correct explanation/i,
      /both.*true.*not.*correct explanation/i,
      /a.*true.*r.*false/i,
      /a.*false.*r.*true/i,
    ];
    const matchedCount = standardPhrasing.filter((re) => opts.some((o) => re.test(o))).length;
    if (matchedCount < 3) {
      issues.push('Assertion-Reason question doesn\'t use the standard 4-option phrasing pattern — please verify the options are complete.');
    }
  }
  return issues;
}

function englishChecks(q) {
  const issues = [];
  const text = q.questionText.trim();
  if (text.length > 0 && text[0] !== text[0].toUpperCase()) {
    issues.push('Question text doesn\'t start with a capital letter.');
  }
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 2) {
      issues.push(`Repeated word detected: "${words[i]} ${words[i]}".`);
      break;
    }
  }
  return issues;
}

const SUBJECT_CHECKERS = {
  Physics: physicsChecks,
  Chemistry: chemistryChecks,
  Biology: biologyChecks,
  Reasoning: reasoningChecks,
  English: englishChecks,
};

function ruleBasedCheck(q) {
  const issues = [...structuralChecks(q)];
  const specialist = SUBJECT_CHECKERS[q.subject];
  if (specialist) {
    issues.push(...specialist(q));
  }
  return {
    status: issues.length > 0 ? 'FLAGGED' : 'PASSED',
    issues,
    engine: 'RULE_BASED',
  };
}

async function claudeCheckBatch(questions) {
  const numbered = questions.map((q, i) => {
    const isNVQ = isNVQQuestion(q);
    if (isNVQ) {
      return (
        `Q${i + 1} [${q.subject || 'General'} specialist — ${q.chapter || 'Unknown chapter'} (Numerical Value Question / NVQ)]:\n` +
        `${q.questionText}\n` +
        `Marked numerical answer: ${q.correctOption}`
      );
    }
    return (
      `Q${i + 1} [${q.subject || 'General'} specialist — ${q.chapter || 'Unknown chapter'}]:\n` +
      `${q.questionText}\n` +
      `A) ${q.options?.A}  B) ${q.options?.B}  C) ${q.options?.C}  D) ${q.options?.D}\n` +
      `Marked correct answer: ${q.correctOption}`
    );
  }).join('\n\n');

  const prompt =
    `You are a panel of subject-specialist exam reviewers (Physics, Chemistry, Biology, Reasoning, ` +
    `English) for Indian competitive exams (NEET/JEE/EAPCET). For each question below, acting as the ` +
    `specialist matching its subject, check: (a) is the marked correct answer actually correct, ` +
    `(b) for MCQs: are all four options well-formed and distinct (NVQs intentionally have no options), ` +
    `(c) any factual or formatting problems.\n\n` +
    `Respond ONLY with a JSON array, no other text:\n` +
    `[{"q": 1, "status": "PASSED"|"FLAGGED", "issues": ["short issue 1", ...]}, ...]\n` +
    `Use "PASSED" with an empty issues array if the question is fine.\n\n` +
    `Questions:\n\n${numbered}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Claude API error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed)) throw new Error('Claude response was not a JSON array');

  return questions.map((q, i) => {
    const match = parsed.find((p) => p.q === i + 1) || parsed[i];
    if (!match || !['PASSED', 'FLAGGED'].includes(match.status)) {
      return { ...ruleBasedCheck(q), engine: 'RULE_BASED' };
    }
    return {
      status: match.status,
      issues: Array.isArray(match.issues) ? match.issues.slice(0, 6).map((s) => String(s).slice(0, 200)) : [],
      engine: 'CLAUDE',
    };
  });
}

/**
 * Runs checks on an array of question rows. Returns results in the same
 * order: [{ status, issues, engine }]
 */
async function runChecks(questions) {
  const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const results = [];

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    if (useClaude) {
      try {
        const checked = await claudeCheckBatch(batch);
        results.push(...checked);
        continue;
      } catch (err) {
        console.error(`Claude checking failed for batch starting at ${i}, falling back to rules:`, err.message);
      }
    }
    results.push(...batch.map((q) => ruleBasedCheck(q)));
  }

  return results;
}

module.exports = { runChecks, ruleBasedCheck, isNVQQuestion };
