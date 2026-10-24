const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  /const mathWords = \/\\b\(sin\|cos\|tan\|sec\|cot\|csc\|ln\|log\|lim\|dx\|dt\|dy\|dz\|du\|dv\|dI,\|I,\)\\b\//g,
  "const mathWords = /\\b(sin|cos|tan|sec|cot|csc|ln|log|lim|dx|dt|dy|dz|du|dv|d\\\\theta|\\\\theta|d\\\\phi|\\\\phi)\\b/"
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
