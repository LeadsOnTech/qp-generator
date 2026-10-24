const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");

content = content.replace(
  'if (q.questionType === "DECIMAL" || q.questionType === "NUMERICAL") {',
  'if (q.questionType === "DECIMAL" || q.questionType === "NUMERICAL" || q.questionType === "NVQ") {'
);

fs.writeFileSync("backend/src/lib/pdfBuilder.js", content, "utf8");
