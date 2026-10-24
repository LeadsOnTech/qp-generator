const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/extract.js", "utf8");

content = content.replace(
  "const VALID_QUESTION_TYPES = ['MCQ', 'ASSERTION_REASON', 'MATCH_FOLLOWING', 'STATEMENT_I_II', 'NUMERICAL', 'NVQ', 'DIAGRAM_BASED', 'MULTI', 'MATRIX', 'COMPREHENSION', 'DECIMAL'];",
  "const VALID_QUESTION_TYPES = ['MCQ', 'ASSERTION_REASON', 'MATCH_FOLLOWING', 'STATEMENT_I_II', 'NUMERICAL', 'NVQ', 'NVT', 'DIAGRAM_BASED', 'MULTI', 'MATRIX', 'COMPREHENSION', 'DECIMAL'];"
);

content = content.replace(
  "if (questionType !== 'DECIMAL' && questionType !== 'NUMERICAL' && questionType !== 'NVQ' && questionType !== 'MATRIX' && questionType !== 'COMPREHENSION') {",
  "if (questionType !== 'DECIMAL' && questionType !== 'NUMERICAL' && questionType !== 'NVQ' && questionType !== 'NVT' && questionType !== 'MATRIX' && questionType !== 'COMPREHENSION') {"
);

content = content.replace(
  "} else if (questionType === 'DECIMAL' || questionType === 'NUMERICAL' || questionType === 'NVQ') {",
  "} else if (questionType === 'DECIMAL' || questionType === 'NUMERICAL' || questionType === 'NVQ' || questionType === 'NVT') {"
);

fs.writeFileSync("backend/src/lib/extract.js", content, "utf8");
