const fs = require("fs");
const path = require("path");

const auditorPath = path.join(__dirname, "src", "lib", "autoQCAuditor.js");
let content = fs.readFileSync(auditorPath, "utf8");

if (!content.includes("ANTHROPIC_API_KEY")) {
  const replacement = `const API_KEY = process.env.GEMINI_API_KEY;
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

async function runAIBackgroundAudit(uploadBatchId) {
  if (!API_KEY && !CLAUDE_KEY) {
    console.log("[Auto-QC] Skipped: Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY found in .env");
    return;
  }`;

  content = content.replace(/const API_KEY = process\.env\.GEMINI_API_KEY;\s+async function runAIBackgroundAudit\(uploadBatchId\) \{\s+if \(!API_KEY\) \{\s+console\.log\("\[Auto-QC\] Skipped: GEMINI_API_KEY not found in \.env"\);\s+return;\s+\}/, replacement);

  const fetchLogic = `
      try {
        let results = null;
        
        if (CLAUDE_KEY) {
          // Use Claude for superior accuracy
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': CLAUDE_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-latest',
              max_tokens: 2000,
              system: 'You are an expert JEE/NEET QC Auditor. Return ONLY a strict JSON array (no markdown tags, no markdown blocks, just raw JSON).',
              messages: [{ role: 'user', content: prompt }]
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          if (data.content && data.content[0].text) {
             let text = data.content[0].text.trim();
             // Remove markdown code blocks if Claude includes them despite instructions
             if (text.startsWith('\`\`\`json')) text = text.slice(7);
             if (text.startsWith('\`\`\`')) text = text.slice(3);
             if (text.endsWith('\`\`\`')) text = text.slice(0, -3);
             results = JSON.parse(text.trim());
          }
        } else {
          // Fallback to Gemini
          const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=\${API_KEY}\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: "application/json" }
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          if (data.candidates && data.candidates[0].content.parts[0].text) {
             results = JSON.parse(data.candidates[0].content.parts[0].text.trim());
          }
        }

        if (results) {`;

  const oldFetchRegex = /try \{\s*const response = await fetch\(`https:\/\/generativelanguage\.googleapis\.com[^`]+`,\s*\{\s*method: "POST",\s*headers: \{ "Content-Type": "application\/json" \},\s*body: JSON\.stringify\(\{\s*contents: \[\{ parts: \[\{ text: prompt \}\] \}\],\s*generationConfig: \{ response_mime_type: "application\/json" \}\s*\}\)\s*\}\);\s*const data = await response\.json\(\);\s*if \(data\.error\) throw new Error\(data\.error\.message\);\s*if \(data\.candidates && data\.candidates\[0\]\.content\.parts\[0\]\.text\) \{\s*const results = JSON\.parse\(data\.candidates\[0\]\.content\.parts\[0\]\.text\.trim\(\)\);/m;
  
  content = content.replace(oldFetchRegex, fetchLogic);
  
  // also need to replace the closing brace of `if (results) {`
  content = content.replace(/}\s*}\s*catch \(e\) {/, "}\n      } catch (e) {");

  fs.writeFileSync(auditorPath, content, "utf8");
}
