const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/exams.js", "utf8");
content = content.replace(
  "questions: { where: { isActive: true } }",
  "questions: { where: { isActive: true, workflowState: 'BANK' } }"
);
fs.writeFileSync("backend/src/routes/exams.js", content, "utf8");
