const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  "const node = mathDocument.convert(latex, { display: displayMode });",
  "const cleanLatex = latex.replace(/\\\\'/g, \"'\");\n    const node = mathDocument.convert(cleanLatex, { display: displayMode });"
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
