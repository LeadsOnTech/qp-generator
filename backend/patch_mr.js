const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "lib", "mathRenderer.js");
let content = fs.readFileSync(file, "utf8");

const replacement = `
    let changed = true;
    while (changed) {
      changed = false;
      const merged = [];
      for (let i = 0; i < segments.length; i++) {
        let seg = segments[i];
        if (seg.type === 'text') {
          const prev = merged[merged.length - 1];
          const next = segments[i + 1];
          if (prev && prev.type === 'math' && next && next.type === 'math') {
            if (/^[\\s=><+\\-*/:,×]+$/.test(seg.value)) {
              prev.value += seg.value + next.value;
              i++;
              changed = true;
              continue;
            }
          }
        }
        merged.push(seg);
      }
      segments.splice(0, segments.length, ...merged);
    }

    return segments;
  }
`;

content = content.replace("return segments;\n  }", replacement);

fs.writeFileSync(file, content, "utf8");
