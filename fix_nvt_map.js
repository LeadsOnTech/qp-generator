const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/extract.js", "utf8");

content = content.replace(
  "let questionType = String(row.questiontype || row.type || 'MCQ').trim().toUpperCase();",
  "let questionType = String(row.questiontype || row.type || 'MCQ').trim().toUpperCase();\n  if (questionType === 'NVT') questionType = 'NVQ';"
);

fs.writeFileSync("backend/src/lib/extract.js", content, "utf8");
