const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

const patch = `
  // Auto-subscript chemical formulas that were lazily written in math mode without subscripts
  // e.g. CH3 -> CH_{3}, but stops safely before any valid math commands like _
  const chemRegexGlob = /\\b(\\d*)((?:[A-Z][a-z]?|[()[\\]]|\\d)+)/g;
  cleanLatex = cleanLatex.replace(chemRegexGlob, (match, p1, p2) => {
    const invalidLower = p2.replace(/[A-Z][a-z]?/g, '').match(/[a-z]/);
    if (/\\d/.test(p2) && /[A-Z]/.test(p2) && !invalidLower) {
      const subbedP2 = p2.replace(/\\d+/g, "_{$&}");
      return p1 + subbedP2;
    }
    return match;
  });
`;

content = content.replace(
  /const node = mathDocument\.convert\(cleanLatex, \{ display: displayMode \}\);/,
  patch + "\n  const node = mathDocument.convert(cleanLatex, { display: displayMode });"
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
