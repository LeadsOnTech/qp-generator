const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "lib", "mathRenderer.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  `const svg = adaptor.innerHTML(node);`,
  `let svg = adaptor.innerHTML(node);
    // If MathJax throws an error (e.g. unbalanced parenthesis), it renders a background rect.
    // SVGtoPDF renders this rect as a solid black box. Strip it so the raw text shows instead.
    svg = svg.replace(/<rect[^>]*data-background="true"[^>]*><\\/rect>/g, '');`
);

fs.writeFileSync(file, content, "utf8");
