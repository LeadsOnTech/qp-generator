const fs = require("fs");
let content = fs.readFileSync("frontend/src/landing.css", "utf8");

content = content.replace(
  /\.hero-title span \{\s*color: #ffffff;\s*\}/,
  ".hero-title span {\n  color: var(--premium-yellow);\n}"
);

fs.writeFileSync("frontend/src/landing.css", content, "utf8");
