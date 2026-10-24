const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");

const replacement = `function formatChemicalFormulas(text) {
  if (!text) return text;
  // Match potential chemical formulas (Element + digits + brackets)
  const chemRegexGlob = /\\b(\\d*)((?:[A-Z][a-z]?|[()[\\]]|\\d)+)\\b/g;
  
  return text.replace(chemRegexGlob, (match, p1, p2) => {
    // Check if it's a valid chemical by ensuring no remaining lowercase letters
    const invalidLower = p2.replace(/[A-Z][a-z]?/g, '').match(/[a-z]/);
    
    // Require at least one digit and one uppercase letter
    if (/\\d/.test(p2) && /[A-Z]/.test(p2) && !invalidLower) {
      const subbedP2 = p2.replace(/\\d+/g, (digits) => {
        return digits.split('').map(d => String.fromCharCode(0x2080 + parseInt(d))).join('');
      });
      return p1 + subbedP2;
    }
    return match;
  });
}`;

content = content.replace(
  /function formatChemicalFormulas\(text\) \{ return text; \}/,
  replacement
);

fs.writeFileSync("backend/src/lib/pdfBuilder.js", content, "utf8");
