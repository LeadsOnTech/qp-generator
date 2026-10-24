const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

const measureReplace = "      optionsHeight = ['A', 'B', 'C', 'D'].reduce((sum, k) => {\n" +
"        const numeral = { A: '1', B: '2', C: '3', D: '4' }[k];\n" +
"        const raw = `(${numeral}) ${q.options[k]}`;\n" +
"        const avail = colWidth - numWidth - 4;\n" +
"        const w = richWidth(doc, raw, fontSize);\n" +
"        let optFontSize = fontSize;\n" +
"        if (w > avail) {\n" +
"          optFontSize = Math.max(6.5, fontSize * (avail / w) * 0.98);\n" +
"        }\n" +
"        const h = richMeasure(doc, raw, avail, optFontSize);\n" +
"        return sum + h + 1;\n" +
"      }, 0);";

let start = content.indexOf("optionsHeight = ['A', 'B', 'C', 'D'].reduce");
let end = content.indexOf("}, 0);", start) + 6;
content = content.slice(0, start) + measureReplace + content.slice(end);

const drawReplace = "      for (const key of ['A', 'B', 'C', 'D']) {\n" +
"        const raw = `(${numeralFor[key]}) ${q.options[key]}`;\n" +
"        const avail = colWidth - numWidth - 4;\n" +
"        const w = richWidth(doc, raw, fontSize);\n" +
"        let optFontSize = fontSize;\n" +
"        if (w > avail) {\n" +
"          optFontSize = Math.max(6.5, fontSize * (avail / w) * 0.98);\n" +
"        }\n" +
"        cursorY = richDraw(doc, raw, x + numWidth, cursorY, avail, optFontSize, SOFT) + 1;\n" +
"      }";

start = content.indexOf("for (const key of ['A', 'B', 'C', 'D']) {");
end = content.indexOf("}", start + 50) + 1;
content = content.slice(0, start) + drawReplace + content.slice(end);

fs.writeFileSync(file, content, "utf8");
