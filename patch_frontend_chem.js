const fs = require("fs");

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  const newFormatter = `function formatChemicals(text) {
  if (!text) return text;
  const chemRegexGlob = /\\b(\\d*)((?:[A-Z][a-z]?|[()[\\]]|\\d)+)\\b/g;
  return text.replace(chemRegexGlob, (match, p1, p2) => {
    const invalidLower = p2.replace(/[A-Z][a-z]?/g, '').match(/[a-z]/);
    if (/\\d/.test(p2) && /[A-Z]/.test(p2) && !invalidLower) {
      const subbedP2 = p2.replace(/\\d+/g, (digits) => {
        return digits.split('').map(d => String.fromCharCode(0x2080 + parseInt(d))).join('');
      });
      return p1 + subbedP2;
    }
    return match;
  });
}

function formatHeadingText(text) {
  if (!text) return text;
  const formattedText = formatChemicals(String(text));
  const regex = /(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/gi;
  const parts = formattedText.split(regex);
  return parts.map((part, i) => (i % 2 === 1) ? <strong key={i}>{part}</strong> : part);
}`;

  content = content.replace(/function formatHeadingText\(text\) \{[\s\S]*?return parts\.map[^\n]*\n\}/, newFormatter);
  
  fs.writeFileSync(filePath, content, "utf8");
}

updateFile("frontend/src/pages/QuestionBank.jsx");
updateFile("frontend/src/pages/PaperPreview.jsx");
