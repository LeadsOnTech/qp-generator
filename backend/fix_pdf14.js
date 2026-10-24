const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

const measureReplace = `      optionsHeight = ['A', 'B', 'C', 'D'].reduce((sum, k) => {
        const numeral = { A: '1', B: '2', C: '3', D: '4' }[k];
        const raw = \`(${numeral}) ${q.options[k]}\`;
        const avail = colWidth - numWidth - 4;
        const w = richWidth(doc, raw, fontSize);
        let optFontSize = fontSize;
        if (w > avail) {
          optFontSize = Math.max(6.5, fontSize * (avail / w) * 0.98); // 0.98 for safe padding
        }
        const h = richMeasure(doc, raw, avail, optFontSize);
        return sum + h + 1;
      }, 0);`;

const drawReplace = `      for (const key of ['A', 'B', 'C', 'D']) {
        const raw = \`(${numeralFor[key]}) ${q.options[key]}\`;
        const avail = colWidth - numWidth - 4;
        const w = richWidth(doc, raw, fontSize);
        let optFontSize = fontSize;
        if (w > avail) {
          optFontSize = Math.max(6.5, fontSize * (avail / w) * 0.98);
        }
        cursorY = richDraw(doc, raw, x + numWidth, cursorY, avail, optFontSize, SOFT) + 1;
      }`;

content = content.replace(/optionsHeight = \['A', 'B', 'C', 'D'\].reduce\(\(sum, k\) => \{[\s\S]*?return sum \+ h \+ 1;\n      \}, 0\);/, measureReplace);
content = content.replace(/for \(const key of \['A', 'B', 'C', 'D'\]\) \{[\s\S]*?cursorY = richDraw[\s\S]*?\+ 1;\n      \}/, drawReplace);

fs.writeFileSync(file, content, "utf8");
