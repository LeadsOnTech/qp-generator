const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  /    const cleanLatex = latex\.replace\(\/\\\\\\\'\|\\\\\\\"\/g, m => m === "\\\\\\\'" \? "'" : '"'\)\r?\n    \.replace\(\/_\{2,\}\/g, match => '\\\\_'\.repeat\(match\.length\)\);\r?\n    \r?\n\r?\n  \} while/,
  `    let cleanLatex = latex.replace(/\\\\'|\\\\"/g, m => m === "\\\\'" ? "'" : '"')
    .replace(/_{2,}/g, match => '\\\\_'.repeat(match.length));

    // Auto-subscript chemical formulas that were lazily written in math mode without subscripts
    const chemRegexGlob = /\\b(\\d*)((?:[A-Z][a-z]?|[()[\\]]|\\d)+)/g;
    cleanLatex = cleanLatex.replace(chemRegexGlob, (match, p1, p2) => {
      const invalidLower = p2.replace(/[A-Z][a-z]?/g, '').match(/[a-z]/);
      if (/\\d/.test(p2) && /[A-Z]/.test(p2) && !invalidLower) {
        // Use a replacer function instead of string substitution to avoid $& issues!
        const subbedP2 = p2.replace(/\\d+/g, (digits) => "_{" + digits + "}");
        return p1 + subbedP2;
      }
      return match;
    });

    const node = mathDocument.convert(cleanLatex, { display: displayMode });
    const svg = adaptor.innerHTML(node);

    // Extract exact width and height from SVG attributes
    const widthMatch = svg.match(/width="([^"]+)ex"/);
    const heightMatch = svg.match(/height="([^"]+)ex"/);
    const verticalAlignMatch = svg.match(/vertical-align:\\s*([^e]+)ex/);

    if (widthMatch && heightMatch) {
      // 1 ex is roughly half the font size
      const exToPt = fontSize * 0.5;
      const w = parseFloat(widthMatch[1]) * exToPt;
      const h = parseFloat(heightMatch[1]) * exToPt;
      const depth = verticalAlignMatch ? Math.abs(parseFloat(verticalAlignMatch[1])) * exToPt : 0;
      
      // Update SVG to use pt units directly so it renders correctly at any size
      const fixedSvg = svg
        .replace(/width="[^"]+"/, \`width="\${w}pt"\`)
        .replace(/height="[^"]+"/, \`height="\${h}pt"\`);

      result = { svg: fixedSvg, width: w, height: h, depth };
    }
  } catch (e) {
    // MathJax will throw if the latex is completely unparseable
  }

  renderCache.set(cacheKey, result);
  return result;
}

function convertMathFormula(text) {
  let result = text;
  let lastResult;
  do {
    lastResult = result;
  } while`
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
