const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");
content = content.replace(
  "const typeWanted = splitCounts(qCount, mix);",
  "const typeWanted = splitCounts(qCount, mix); console.log('qType:', qType, 'typeWanted:', typeWanted, 'typeBucket counts:', Object.keys(typeBucket).map(k=>k+':'+typeBucket[k].length));"
);
fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
