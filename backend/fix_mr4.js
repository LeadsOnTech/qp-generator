const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "lib", "mathRenderer.js");
let content = fs.readFileSync(file, "utf8");

// We need to restore from `let changed = true;` inside autoWrapMathSegment 
// to `parseSegments`.
const restore = `
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < tokens.length; i++) {
      if (isMathToken[i]) continue;
      if (isContextToken(tokens[i])) {
        const leftMath = i > 0 && isMathToken[i - 1];
        const rightMath = i < tokens.length - 1 && isMathToken[i + 1];
        if (leftMath || rightMath) {
          isMathToken[i] = true;
          changed = true;
        }
      }
    }
  }

  const resultParts = [];
  let mathBuffer = [];

  const flushMathBuffer = () => {
    if (mathBuffer.length > 0) {
      const mathStr = mathBuffer.join('');
      const mainMath = mathStr.trim();
      const leadingSpace = mathStr.slice(0, mathStr.length - mathStr.trimStart().length);
      const trailingSpace = mathStr.slice(mathStr.trimEnd().length);

      const puncMatch = mainMath.match(/^(.*?)([,.;!?]*)$/s);
      let coreMath = puncMatch[1];
      let punc = puncMatch[2];

      if (coreMath.trim().length > 0) {
        resultParts.push(leadingSpace + "$" + coreMath + "$" + punc + trailingSpace);
      } else {
        resultParts.push(mathStr);
      }
      mathBuffer = [];
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (isMathToken[i]) {
      if (mathBuffer.length === 0 && /^\\s+$/.test(t)) {
        resultParts.push(t);
      } else {
        mathBuffer.push(t);
      }
    } else {
      flushMathBuffer();
      resultParts.push(t);
    }
  }
  flushMathBuffer();

  return resultParts.join('');
}

function autoWrapMath(text) {
  if (typeof text !== 'string' || text.includes('$')) return text;

  // Split by sentence endings (periods not followed by digit, semicolons, and newlines)
  const segments = text.split(/((?:\\.(?!\\d))|[;\\n\\r]+)/);
  const processedSegments = segments.map((seg, idx) => {
    if (idx % 2 === 0) {
      return autoWrapMathSegment(seg);
    }
    return seg;
  });

  return processedSegments.join('');
}

function parseSegments(text) {
  if (typeof text !== 'string') return [];
  const segments = [];

  function processAndPushText(part) {
    if (!part) return;
    const processed = autoWrapMath(part);
    const pattern = /\\$([^$]+)\\$/g;
    let localLast = 0;
    let match;
    while ((match = pattern.exec(processed)) !== null) {
      if (match.index > localLast) {
        segments.push({ type: 'text', value: processed.slice(localLast, match.index) });
      }
      segments.push({ type: 'math', value: match[1] });
      localLast = match.index + match[0].length;
    }
    if (localLast < processed.length) {
      segments.push({ type: 'text', value: processed.slice(localLast) });
    }
  }

  const mathPattern = /(\\$\\$[^$]+\\$\\$|\\$[^$]+\\$|\\\\ce\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\})/g;
  let lastIndex = 0;
  
  text.replace(mathPattern, (match, p1, offset) => {
    if (offset > lastIndex) {
      processAndPushText(text.slice(lastIndex, offset));
    }
    
    let cleanMath = match;
    if (match.startsWith('$$') && match.endsWith('$$')) {
      cleanMath = match.slice(2, -2);
    } else if (match.startsWith('$') && match.endsWith('$')) {
      cleanMath = match.slice(1, -1);
    }
    
    segments.push({ type: 'math', value: cleanMath });
    lastIndex = offset + match.length;
  });

  if (lastIndex < text.length) {
    processAndPushText(text.slice(lastIndex));
  }

  let changed = true;
  while (changed) {
    changed = false;
    const merged = [];
    for (let i = 0; i < segments.length; i++) {
      let seg = segments[i];
      const prev = merged[merged.length - 1];
      
      if (seg.type === 'math' && prev && prev.type === 'math') {
        prev.value += ' ' + seg.value;
        changed = true;
        continue;
      }
      
      if (seg.type === 'text') {
        const next = segments[i + 1];
        if (prev && prev.type === 'math' && next && next.type === 'math') {
          if (/^[\\s=><+\\-*/:,×xX]+$/.test(seg.value)) {
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

content = content.replace(/let changed = true;[\s\S]*?return segments;\n  \}/, restore.trim());

fs.writeFileSync(file, content, "utf8");
