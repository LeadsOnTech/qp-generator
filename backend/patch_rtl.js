const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "lib", "richTextLayout.js");
let content = fs.readFileSync(file, "utf8");

const oldPushLine = `  function pushLine() {
    if (current.items.length === 0) return;
    // Trim a trailing space so it doesn't affect alignment/width.
    while (current.items.length && current.items[current.items.length - 1].type === 'text'
           && /^\\s+$/.test(current.items[current.items.length - 1].value)) {
      current.items.pop();
    }
    current.height = current.maxAscent + current.maxDescent;
    current.baselineOffset = current.maxAscent;
    lines.push(current);
    current = { items: [], width: 0, maxAscent: textAscent, maxDescent: textHeight - textAscent };
  }`;

const newPushLine = `  function pushLine(isLast = false) {
    if (current.items.length === 0) return;
    // Trim a trailing space so it doesn't affect alignment/width.
    while (current.items.length && current.items[current.items.length - 1].type === 'text'
           && /^\\s+$/.test(current.items[current.items.length - 1].value)) {
      current.width -= current.items.pop().width;
    }
    
    // Justify the line if requested, it's not the last line, and we have items
    if (options.align === 'justify' && !isLast && current.items.length > 1) {
      const extraSpace = width - current.width;
      // Only justify if the line is at least 60% full to prevent huge gaps
      if (extraSpace > 0 && extraSpace < width * 0.4) {
        const spaces = current.items.filter(item => item.type === 'text' && /^\\s+$/.test(item.value));
        if (spaces.length > 0) {
          const addPerSpace = extraSpace / spaces.length;
          spaces.forEach(space => space.width += addPerSpace);
          current.width = width;
        }
      }
    }

    current.height = current.maxAscent + current.maxDescent;
    current.baselineOffset = current.maxAscent;
    lines.push(current);
    current = { items: [], width: 0, maxAscent: textAscent, maxDescent: textHeight - textAscent };
  }`;

content = content.replace(oldPushLine, newPushLine);

// Now update the pushLine() calls
content = content.replace(/pushLine\(\);\n\s*const extraLines/g, "pushLine(true);\n      const extraLines");
content = content.replace(/pushLine\(\);\n\s*\}\n\s*continue;/g, "pushLine(true);\n      }\n      continue;");
content = content.replace(/pushLine\(\);\n\s*if \(isWhitespace\)/g, "pushLine(false);\n      if (isWhitespace)");
content = content.replace(/}\n  pushLine\(\);\n\n  const totalHeight/g, "}\n  pushLine(true);\n\n  const totalHeight");

fs.writeFileSync(file, content, "utf8");
