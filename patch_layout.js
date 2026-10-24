const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/richTextLayout.js", "utf8");

const replacement1 = `  const {
    width,
    fontSize = 11,
    font,
    fontBold,
    lineGap = 2,
    textTransform = (t) => t,
  } = options;

  const headingRegex = /(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/gi;

  const segments = parseSegments(text);
  const tokens = [];

  for (const segment of segments) {
    if (segment.type === 'math') {
      const rendered = renderMath(segment.value, fontSize);
      if (rendered) {
        tokens.push({ type: 'math', rendered, value: segment.value });
      } else {
        const fallback = \`$\\${segment.value}$\`;
        for (const word of fallback.split(/(\\s+)/)) {
          if (word.length) tokens.push({ type: 'text', value: word });
        }
      }
    } else {
      const transformed = textTransform(segment.value);
      
      const parts = transformed.split(headingRegex);
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        const type = (i % 2 === 1) ? 'bold' : 'text';
        for (const word of parts[i].split(/(\\s+)/)) {
          if (word.length) tokens.push({ type, value: word });
        }
      }
    }
  }`;

content = content.replace(
  /const \{\s*width,[\s\S]*?\}\s*\}\s*\}/,
  replacement1
);

const replacement2 = `    } else {
      doc.font(token.type === 'bold' && fontBold ? fontBold : font).fontSize(fontSize);
      tokenWidth = doc.widthOfString(token.value);
      tokenAscent = textAscent;
      tokenDescent = textHeight - textAscent;
    }`;

content = content.replace(
  /\} else \{\s*tokenWidth = doc\.widthOfString\(token\.value\);\s*tokenAscent = textAscent;\s*tokenDescent = textHeight - textAscent;\s*\}/,
  replacement2
);

const replacement3 = `      } else {
        doc.font(item.type === 'bold' && options.fontBold ? options.fontBold : font).fontSize(fontSize).fill(color);
        const textTop = cursorY + line.baselineOffset - doc.currentLineHeight() * 0.8;
        doc.text(item.value, cursorX, textTop, { lineBreak: false, width: item.width + 2 });
      }`;

content = content.replace(
  /\} else \{\s*doc\.font\(font\)\.fontSize\(fontSize\)\.fill\(color\);\s*\/\/[^\n]*\n\s*const textTop = [^\n]*\n\s*doc\.text\([^\n]*\);\s*\}/,
  replacement3
);

fs.writeFileSync("backend/src/lib/richTextLayout.js", content, "utf8");
