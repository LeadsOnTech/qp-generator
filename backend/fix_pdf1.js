const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

// Change function signatures
content = content.replace(/function measureQuestionHeight\(doc, q, index, colWidth\) \{/, 'function measureQuestionHeight(doc, q, index, colWidth, fontSize = 11, questionGap = 6) {');
content = content.replace(/function drawQuestion\(doc, q, index, x, y, colWidth\) \{/, 'function drawQuestion(doc, q, index, x, y, colWidth, fontSize = 11, questionGap = 6) {');
content = content.replace(/function richMeasure\(doc, text, width, fontSize, align = 'justify'\) \{/, 'function richMeasure(doc, text, width, fontSize = 11, align = "justify") {');
content = content.replace(/function richDraw\(doc, text, x, y, width, fontSize, color, align = 'justify'\) \{/, 'function richDraw(doc, text, x, y, width, fontSize = 11, color, align = "justify") {');

fs.writeFileSync(file, content, "utf8");
