const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");
content = content.replace(
  "const typeWanted = splitCounts(qCount, mix); console.log('qType:', qType, 'typeWanted:', typeWanted, 'typeBucket counts:', Object.keys(typeBucket).map(k=>k+':'+typeBucket[k].length));",
  "const typeWanted = splitCounts(qCount, mix);"
);

content = content.replace(
  "const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };",
  "const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };"
);

// Actually let's just log before the loop:
content = content.replace(
  "for (const level of ['EASY', 'MEDIUM', 'HARD']) {",
  "console.log('qType:', qType, 'typeWanted:', typeWanted, 'typeBucket:', Object.keys(typeBucket).map(k=>k+':'+typeBucket[k].length));\n        for (const level of ['EASY', 'MEDIUM', 'HARD']) {"
);

fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
