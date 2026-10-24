const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");
content = content.replace(
  "const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };",
  "console.log('byDifficulty:', Object.keys(byDifficulty).map(k=>k+':'+byDifficulty[k].length));\n        const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };"
);
fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
