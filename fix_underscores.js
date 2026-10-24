const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  /const cleanLatex = latex\.replace\(\/\\\\\'\/g, "'"\)\.replace\(\/\\\\\"\/g, '"'\);/,
  `const cleanLatex = latex.replace(/\\\\'|\\\\"/g, m => m === "\\\\'" ? "'" : '"')
    .replace(/_{2,}/g, match => '\\\\_'.repeat(match.length));`
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
