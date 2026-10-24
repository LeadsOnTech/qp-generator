const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(/for \(const key of \['A', 'B', 'C', 'D'\]\) \{[\s\S]*?cursorY \+ questionGap;/g, `for (const key of ['A', 'B', 'C', 'D']) {
        const raw = \`(\${numeralFor[key]}) \${q.options[key]}\`;
        const avail = colWidth - numWidth - 4;
        const w = richWidth(doc, raw, fontSize);
        let optFontSize = fontSize;
        if (w > avail) {
          optFontSize = Math.max(6.5, fontSize * (avail / w) * 0.98);
        }
        cursorY = richDraw(doc, raw, x + numWidth, cursorY, avail, optFontSize, SOFT) + 1;
      }
    }
  
    return cursorY + questionGap;`);

fs.writeFileSync(file, content, "utf8");
