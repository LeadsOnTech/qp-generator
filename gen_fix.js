const fs = require('fs');

const fixScript = `
const fs = require('fs');
let content = fs.readFileSync('backend/src/lib/mathRenderer.js', 'utf8');

const subRegexStr = "result = result.replace(/([₀₁₂₃₄₅₆₇₈₉₋ₐ₊ₙᵣ]+)/g, (match) => {";
const supRegexStr = "result = result.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣʸⁱ]+)/g, (match) => {";

// Replace corrupted subRegex
content = content.replace(/result = result\.replace\(\/\(\[.*?\]\)\+\/g, \(match\) => \{\n\s*let mapped = match\.split\(''\)\.map\(\(c\) => subscriptMap\[c\]\)\.join\(''\);\n\s*return \`_\{[^}]*\}\`;\n\s*\}\);/g, subRegexStr + "\n    let mapped = match.split('').map((c) => subscriptMap[c]).join('');\n    return `_{${mapped}}`;\n  });");

// Actually, I can just replace the entire function 'convertMathFormula(formula)' !
`;
fs.writeFileSync('fix_math.js', fixScript, 'utf8');
