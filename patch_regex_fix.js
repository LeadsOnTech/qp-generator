const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  /const mathAnchorRegex = \/\[=\\\^\\\_\\\\\\\/\]\|\\b\(\?:sum\|infty\|frac\|int\)\\b\/u;/g,
  "const mathAnchorRegex = /[=^_\\\\\\/]|\\b(?:sum|infty|frac|int)\\b/u;"
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
