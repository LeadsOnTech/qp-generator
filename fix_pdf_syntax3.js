const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");

content = content.replace(/const index = i \+ 1;[\r\n\s]+const index = q\._renderIndex;/g, "const index = q._renderIndex;");

fs.writeFileSync("backend/src/lib/pdfBuilder.js", content, "utf8");
