const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/questions.js", "utf8");

const multerCode = `
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
`;

if (!content.includes("multer")) {
  content = content.replace("const { requireAuth, requireAdmin } = require('../lib/auth');", "const { requireAuth, requireAdmin } = require('../lib/auth');\n" + multerCode);
}

const searchImageCode = `
/**
 * POST /api/questions/search-image
 */
router.post('/search-image', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  let extractedText = '';
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    const base64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;

    if (ANTHROPIC_API_KEY) {
      const payload = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text', text: 'Extract the text and mathematical formulas from this question screenshot. Format math using LaTeX. Return only the extracted text, no other commentary. DO NOT use markdown like **.' }
          ]
        }]
      };
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (data.content && data.content[0]) {
        extractedText = data.content[0].text;
      }
    } else if (GEMINI_API_KEY) {
      const payload = {
        contents: [{
          parts: [
            { inline_data: { mime_type: mime, data: base64 } },
            { text: 'Extract the text and mathematical formulas from this question screenshot. Format math using LaTeX. Return only the extracted text, no other commentary. DO NOT use markdown like **.' }
          ]
        }]
      };
      const r = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${GEMINI_API_KEY}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (data.candidates && data.candidates[0]) {
        extractedText = data.candidates[0].content.parts[0].text;
      }
    } else {
      return res.status(400).json({ error: 'Please add GEMINI_API_KEY or ANTHROPIC_API_KEY to backend/.env to use Search by Screenshot.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'AI Extraction failed: ' + err.message });
  }

  // Find matches using Jaccard similarity on bigrams
  const allQs = await prisma.question.findMany({
    where: { isActive: true },
    select: { id: true, questionText: true, optionA: true, optionB: true, optionC: true, optionD: true, solutionText: true, chapter: { include: { subject: true } } }
  });

  function getBigrams(str) {
    const s = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = new Set();
    for(let i=0; i<s.length-1; i++) b.add(s.slice(i, i+2));
    return b;
  }
  const extBigrams = getBigrams(extractedText);
  if (extBigrams.size === 0) return res.json({ extractedText, matches: [] });

  const scored = allQs.map(q => {
    const combined = [q.questionText, q.optionA, q.optionB, q.optionC, q.optionD].join(' ');
    const qb = getBigrams(combined);
    let intersection = 0;
    for (let bg of extBigrams) if (qb.has(bg)) intersection++;
    const union = extBigrams.size + qb.size - intersection;
    const score = union === 0 ? 0 : intersection / union;
    return { ...q, matchScore: Math.round(score * 100) };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const topMatches = scored.slice(0, 5).filter(q => q.matchScore >= 5); // threshold

  res.json({ extractedText, matches: topMatches });
});

/**
 * PUT /api/questions/:id
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const q = await prisma.question.findUnique({ where: { id } });
    if (!q) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'ADMIN' && q.ownerInstituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = req.body;
    // Don't update relations if not needed, just plain fields
    delete data.id; delete data.papers; delete data.chapter; delete data.topic;
    const updated = await prisma.question.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/questions/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const q = await prisma.question.findUnique({ where: { id }, include: { papers: true } });
    if (!q) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'ADMIN' && q.ownerInstituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (q.papers && q.papers.length > 0) {
      return res.status(400).json({ error: 'Cannot delete question: it is already used in one or more generated papers.' });
    }
    await prisma.question.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!content.includes("/search-image")) {
  content = content.replace("module.exports = router;", searchImageCode + "\nmodule.exports = router;");
}

fs.writeFileSync("backend/src/routes/questions.js", content, "utf8");
