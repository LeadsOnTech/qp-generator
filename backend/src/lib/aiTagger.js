// ---------------------------------------------------------------------------
// Phase 2 — Difficulty tagging engine.
//
// Two modes, chosen automatically:
//   1. CLAUDE mode  — if ANTHROPIC_API_KEY is set in backend/.env, questions
//                     are sent to the Claude API in batches for a real
//                     AI difficulty assessment (with confidence + rationale).
//   2. RULE_BASED   — if no API key is set, a transparent heuristic tagger
//                     runs instead, so the whole review workflow can be
//                     tested end-to-end without any API cost. Suggestions
//                     are clearly labelled RULE_BASED with lower confidence.
//
// In BOTH modes, nothing is final until a human reviews it — suggestions go
// to the review queue, and only Accept/Override sets the real difficulty.
// ---------------------------------------------------------------------------

const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 15;

function heuristicTag(q) {
  const text = `${q.questionText}`.toLowerCase();
  const allText = `${q.questionText} ${q.optionA} ${q.optionB} ${q.optionC} ${q.optionD}`;

  // Assertion-Reason / Statement types are analytically harder by design
  if (q.questionType === 'ASSERTION_REASON' || q.questionType === 'STATEMENT_I_II') {
    return { difficulty: 'HARD', confidence: 0.6, rationale: 'Assertion-Reason / Statement type — analytical by design' };
  }
  if (q.questionType === 'MATCH_FOLLOWING') {
    return { difficulty: 'MEDIUM', confidence: 0.55, rationale: 'Match-the-Following — multi-item recall' };
  }

  // Direct recall patterns → EASY
  const recallPatterns = [
    'is known as', 'is called', 'the si unit', 'was introduced by', 'was discovered by',
    'basic unit of', 'is secreted by', 'consists of how many', 'example of',
  ];
  if (recallPatterns.some((p) => text.includes(p))) {
    return { difficulty: 'EASY', confidence: 0.55, rationale: 'Direct-recall phrasing detected' };
  }

  // Numerical / calculation signals → MEDIUM+
  const hasNumbers = /\d/.test(allText);
  const hasCalcWords = /calculate|find the|determine|ratio|percentage|efficiency|focal length|velocity|acceleration|moles|molarity|ph of/i.test(allText);
  const isLong = q.questionText.length > 160;

  if (hasNumbers && hasCalcWords && isLong) {
    return { difficulty: 'HARD', confidence: 0.5, rationale: 'Multi-step numerical with long stem' };
  }
  if (hasNumbers && hasCalcWords) {
    return { difficulty: 'MEDIUM', confidence: 0.55, rationale: 'Numerical/calculation question' };
  }
  if (isLong) {
    return { difficulty: 'MEDIUM', confidence: 0.45, rationale: 'Long stem — likely applied concept' };
  }

  return { difficulty: 'MEDIUM', confidence: 0.4, rationale: 'No strong signal — defaulted to Medium' };
}

async function claudeTagBatch(questions) {
  const numbered = questions.map((q, i) => (
    `Q${i + 1} [${q.subject || 'Unknown subject'} — ${q.chapter || 'Unknown chapter'} — type ${q.questionType}]:\n` +
    `${q.questionText}\n` +
    `A) ${q.optionA}  B) ${q.optionB}  C) ${q.optionC}  D) ${q.optionD}`
  )).join('\n\n');

  const prompt =
    `You are an experienced NEET/JEE/EAPCET academic director rating question difficulty for Indian competitive-exam aspirants.\n\n` +
    `Rate each question below as EASY, MEDIUM, or HARD:\n` +
    `- EASY: direct recall, single-step, a well-prepared average student answers in <30 seconds\n` +
    `- MEDIUM: applied concept or 1-2 step calculation, needs real understanding\n` +
    `- HARD: multi-step, multi-concept, analytical (e.g. tricky Assertion-Reason), top-quartile discriminator\n\n` +
    `Respond ONLY with a JSON array, no other text, one object per question in order:\n` +
    `[{"q": 1, "difficulty": "EASY", "confidence": 0.9, "rationale": "one short line"}, ...]\n\n` +
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
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed)) throw new Error('Claude response was not a JSON array');

  return questions.map((q, i) => {
    const match = parsed.find((p) => p.q === i + 1) || parsed[i];
    const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(match?.difficulty) ? match.difficulty : null;
    if (!difficulty) return { ...heuristicTag(q), engine: 'RULE_BASED' };
    return {
      difficulty,
      confidence: typeof match.confidence === 'number' ? Math.min(Math.max(match.confidence, 0), 1) : 0.7,
      rationale: (match.rationale || '').slice(0, 200) || 'Rated by AI',
      engine: 'CLAUDE',
    };
  });
}

/**
 * Tags an array of question rows. Returns results in the same order:
 * [{ difficulty, confidence, rationale, engine }]
 */
async function tagQuestions(questions) {
  const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const results = [];

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    if (useClaude) {
      try {
        const tagged = await claudeTagBatch(batch);
        results.push(...tagged);
        continue;
      } catch (err) {
        console.error(`Claude tagging failed for batch starting at ${i}, falling back to rules:`, err.message);
      }
    }
    results.push(...batch.map((q) => ({ ...heuristicTag(q), engine: 'RULE_BASED' })));
  }

  return results;
}

module.exports = { tagQuestions };
