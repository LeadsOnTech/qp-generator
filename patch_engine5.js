const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");
content = content.replace(
  "const deduplicated = [];",
  "console.log('rawPool len:', rawPool.length);\nconst deduplicated = [];"
);
fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
