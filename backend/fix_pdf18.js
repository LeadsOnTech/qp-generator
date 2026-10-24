const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

const matchStr = "}) ${q.options[key]}`";
const badIndex = content.indexOf(matchStr);
if (badIndex !== -1) {
    const nextCurly = content.indexOf("}", badIndex);
    content = content.slice(0, badIndex) + content.slice(nextCurly);
    fs.writeFileSync(file, content, "utf8");
}
