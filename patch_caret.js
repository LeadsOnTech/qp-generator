const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  /let cleanLatex = latex\.replace\(\/\\\\\'\|\\\\\"\/g, m => m === "\\\\'" \? "'" : '"'\)\s*\.replace\(\/_\{2,\}\/g, match => '\\\\_'\.repeat\(match\.length\)\);/,
  `let cleanLatex = latex.replace(/\\\\'|\\\\"/g, m => m === "\\\\'" ? "'" : '"')
      .replace(/_{2,}/g, match => '\\\\_'.repeat(match.length))
      .replace(/\\^([+-]?\\d+)/g, "^{$1}");`
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
