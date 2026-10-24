const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/richTextLayout.js", "utf8");

content = content.replace(
  /\} else \{\s*doc\.font\(font\)\.fontSize\(fontSize\)\.fill\(color\);[\s\S]*?doc\.text\([^\n]*\);\s*\}/,
  `} else {
        doc.font(item.type === 'bold' && options.fontBold ? options.fontBold : font).fontSize(fontSize).fill(color);
        // doc.text places by the top of the line box, so shift up by the
        // difference between this line's baseline and a plain text line's.
        const textTop = cursorY + line.baselineOffset - doc.currentLineHeight() * 0.8;
        doc.text(item.value, cursorX, textTop, { lineBreak: false, width: item.width + 2 });
      }`
);

fs.writeFileSync("backend/src/lib/richTextLayout.js", content, "utf8");
