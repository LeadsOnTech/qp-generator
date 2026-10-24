const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/extract.js", "utf8");

const replacement = `function stripOptionPrefix(text) {
  if (!text) return text;
  const r1 = /^\\s*(?:\\([1-4a-dA-D]\\)\\s*)/i;
  const r2 = /^\\s*(?:[1-4a-dA-D][\\.\\)]\\s+)/i;
  const r3 = /^\\s*(?:[1-4a-dA-D][\\.\\)])$/i;

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
  const optionD = stripOptionPrefix(String(row.optiond || '').trim());`;

content = content.replace(
  /function validateRow\(row, rowIndex\) \{\s*const errors = \[\];\s*const questionText = String\(row\.question \|\| ''\)\.trim\(\);\s*const optionA = String\(row\.optiona \|\| ''\)\.trim\(\);\s*const optionB = String\(row\.optionb \|\| ''\)\.trim\(\);\s*const optionC = String\(row\.optionc \|\| ''\)\.trim\(\);\s*const optionD = String\(row\.optiond \|\| ''\)\.trim\(\);/g,
  replacement
);

fs.writeFileSync("backend/src/lib/extract.js", content, "utf8");
