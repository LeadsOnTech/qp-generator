const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  "// Handle caret and underscore subscripts/superscripts with parenthesis",
  "result = result.replace(/\\bsum\\b/g, '\\\\sum ');\n  result = result.replace(/\\binfty\\b/g, '\\\\infty ');\n  result = result.replace(/\\\\\\\\sum /g, '\\\\sum ');\n  result = result.replace(/\\\\\\\\infty /g, '\\\\infty ');\n\n  // Handle caret and underscore subscripts/superscripts with parenthesis"
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
