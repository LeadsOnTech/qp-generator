const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/syllabus.js", "utf8");

content = content.replace(
  "where: { isActive: true }",
  "where: { isActive: true, workflowState: 'BANK' }"
);
content = content.replace(
  "where: { isActive: true }",
  "where: { isActive: true, workflowState: 'BANK' }"
);

fs.writeFileSync("backend/src/routes/syllabus.js", content, "utf8");
