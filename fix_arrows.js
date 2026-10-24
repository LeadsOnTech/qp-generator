const fs = require("fs");
let content = fs.readFileSync("frontend/src/landing.css", "utf8");

content = content.replace(
  /\.step-connector-container \{\s*position: absolute;\s*top: 140px;\s*left: 20%;\s*width: 60%;/s,
  ".step-connector-container {\n  position: absolute;\n  top: 140px;\n  left: 16%;\n  width: 68%;"
);

content = content.replace(
  /\.step-connector-line \{\s*flex: 1;/s,
  ".step-connector-line {\n  flex: 1;\n}\n.step-connector-line:nth-child(3) {\n  flex: 2;\n}\n.step-connector-line {\n  /* kept for other props */"
);

fs.writeFileSync("frontend/src/landing.css", content, "utf8");
