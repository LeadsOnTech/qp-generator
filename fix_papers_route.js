const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/papers.js", "utf8");

content = content.replace(
  "if (!s.name || !Number.isInteger(s.count) || s.count < 1)",
  "if (!s.name || (!Number.isInteger(s.mcqCount) && !Number.isInteger(s.nvqCount)) || (s.mcqCount || 0) + (s.nvqCount || 0) < 1)"
);

fs.writeFileSync("backend/src/routes/papers.js", content, "utf8");
