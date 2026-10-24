const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

// ---------------------------------------------------------------------------
// Real mathematical typesetting.
//
// Unicode characters alone (π, √, ∫, superscripts) can only ever produce
// symbols sitting in a straight line. Genuine textbook notation is
// two-dimensional: fractions stacked vertically, a square-root bar
// stretching across a whole expression, summation limits above and below
// the sigma, matrices, vectors with arrows. That cannot be faked with
// characters — it needs a real typesetting engine.
//
// This module converts LaTeX (e.g. "\frac{dy}{dx}") into an SVG image via
// MathJax, which is then drawn into the PDF. Each rendered expression is
// measured accurately so the surrounding text layout can flow around it.
// ---------------------------------------------------------------------------

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const texInput = new TeX({
  packages: [...AllPackages, 'physics', 'mhchem'],
  macros: {
    // bm (Bold Math) polyfill for vector fields
    bm: ['\\boldsymbol{#1}', 1],
    // siunitx polyfills to guarantee upright rendering for units (e.g. \\SI{9.8}{\\meter\\per\\second\\squared})
    SI: ['#1\\,\\mathrm{#2}', 2],
    num: ['#1', 1],
    unit: ['\\mathrm{#1}', 1],
    // Angstrom constant mapping to avoid undefined control sequence errors
    AA: '\\text{\\u00C5}'
  }
});
const svgOutput = new SVG({ fontCache: 'none' }); // 'none' keeps each SVG self-contained
const mathDocument = mathjax.document('', { InputJax: texInput, OutputJax: svgOutput });

// Rendering the same expression repeatedly (common across a paper — think
// how often "\frac{dy}{dx}" appears) is wasteful, so results are cached.
const renderCache = new Map();
const MAX_CACHE_ENTRIES = 2000;

/**
 * MathJax reports SVG dimensions in "ex" units (relative to font size).
 * Converting to PDF points needs the ratio of 1ex to the font size. For
 * the fonts used here 1ex is very close to 0.45em, which matches what
 * MathJax itself assumes by default.
 */
const EX_TO_EM = 0.45;

function parseExValue(value) {
  if (typeof value !== 'string') return 0;
  const match = value.match(/^([\d.]+)ex$/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Renders a LaTeX string and returns everything needed to place it:
 *   { svg, width, height, depth }
 * width/height/depth are in PDF points for the given fontSize. `depth` is
 * how far the expression hangs BELOW the text baseline (a fraction's
 * denominator, for example), which is what allows inline math to sit
 * correctly against surrounding words rather than floating.
 *
 * Returns null if the LaTeX is invalid, so a single malformed expression
 * can never break an entire paper — the caller falls back to plain text.
 */
function renderMath(latex, fontSize, displayMode = false) {
  const cacheKey = `${latex}::${fontSize}::${displayMode}`;
  if (renderCache.has(cacheKey)) return renderCache.get(cacheKey);

  let result = null;
  try {
    let cleanLatex = latex.replace(/\\'|\\"/g, m => m === "\\'" ? "'" : '"')
      .replace(/_{2,}/g, match => '\\_'.repeat(match.length))
      .replace(/\^([+-]?\d+)/g, "^{$1}");

    // Auto-subscript chemical formulas that were lazily written in math mode without subscripts
    const chemRegexGlob = /\b(\d*)((?:[A-Z][a-z]?|[()[\]]|\d)+)/g;
    cleanLatex = cleanLatex.replace(chemRegexGlob, (match, p1, p2) => {
      const invalidLower = p2.replace(/[A-Z][a-z]?/g, '').match(/[a-z]/);
      if (/\d/.test(p2) && /[A-Z]/.test(p2) && !invalidLower) {
        const subbedP2 = p2.replace(/\d+/g, (digits) => "_{" + digits + "}");
        return p1 + subbedP2;
      }
      return match;
    });

    const node = mathDocument.convert(cleanLatex, { display: displayMode });
    let svg = adaptor.innerHTML(node);
    // If MathJax throws an error (e.g. unbalanced parenthesis), it renders a background rect.
    // SVGtoPDF renders this rect as a solid black box. Strip it so the raw text shows instead.
    svg = svg.replace(/<rect[^>]*data-background="true"[^>]*><\/rect>/g, '');

    const widthMatch = svg.match(/width="([^"]+)ex"/);
    const heightMatch = svg.match(/height="([^"]+)ex"/);
    const verticalAlignMatch = svg.match(/vertical-align:\s*([^e]+)ex/);

    if (widthMatch && heightMatch) {
      const exToPt = fontSize * 0.5;
      const w = parseFloat(widthMatch[1]) * exToPt;
      const h = parseFloat(heightMatch[1]) * exToPt;
      const depth = verticalAlignMatch ? Math.abs(parseFloat(verticalAlignMatch[1])) * exToPt : 0;
      
      const fixedSvg = svg
        .replace(/width="[^"]+"/, `width="${w}pt"`)
        .replace(/height="[^"]+"/, `height="${h}pt"`);

      result = { svg: fixedSvg, width: w, height: h, depth };
    }
  } catch (e) {}
  renderCache.set(cacheKey, result);
  return result;
}

function convertMathFormula(text) {
  let result = text;
  let lastResult;
  do {
    lastResult = result;
  } while (result !== lastResult);

  // Parenthesized divisions: (num)/den, num/(den), (num)/(den)
  result = result.replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '\\frac{$1}{$2}');
  result = result.replace(/\(([^)]+)\)\/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\\theta^_]+)/g, '\\frac{$1}{$2}');
  result = result.replace(/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\\theta^_]+)\/\(([^)]+)\)/g, '\\frac{$1}{$2}');
  // Simple fractions: a/b where a and b are numbers or simple variables (e.g. 1/e, \pi/4, x/2)
  result = result.replace(/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\\theta^_]+)\/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\\theta^_]+)/g, (match, num, den) => {
    if (num.startsWith('frac') || num.includes('frac') || den.includes('frac')) return match;
    // Exclude common physical units from being stacked vertically
    const units = /^(mol|mole|kg|g|mg|s|ms|m|cm|mm|nm|J|K|L|mL|N|Pa|atm|Hz|W|V|A|C|F|Omega)(?:\^[+-]?\d+)?$/i;
    if (units.test(den)) return match;
    return `\\frac{${num}}{${den}}`;
  });


  // Trig / Log / Limit functions:
  const functions = ['sin', 'cos', 'tan', 'sec', 'cot', 'csc', 'ln', 'log', 'lim', 'sinh', 'cosh', 'tanh'];
  functions.forEach(fn => {
    const regex = new RegExp(`\\b${fn}\\b`, 'g');
    result = result.replace(regex, `\\${fn}`);
  });

  // Limits formatting: \lim_{n \to \infty}
  result = result.replace(/\\lim_\{([^}]+)\}/g, '\\lim_{$1}');

  // Sums/Prods limits:
  result = result.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '\\sum_{$1}^{$2}');

  return result.trim();
}

const blacklist = new Set([
  'for', 'in',
  'evaluate', 'indefinite', 'integral', 'using', 'formulation', 'limit', 'value', 'equal', 'then',
  'the', 'of', 'is', 'and', 'with', 'respect', 'parameters', 'substitute', 'gives', 'differentiating',
  'thus', 'comparing', 'coefficients', 'test', 'symmetry', 'since', 'odd', 'function', 'integrated',
  'over', 'symmetric', 'limits', 'by', 'standard', 'property', 'correct', 'answer', 'jee', 'main',
  'shift', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'test', 'weekly', 'paper', 'question', 'options', 'correctoption', 'exam', 'subject', 'chapter',
  'topic', 'difficulty', 'solution', 'solutions', 'correct', 'answer', 'key', 'provided', 'not',
  'let', 'show', 'shows', 'find', 'choose', 'correctly', 'where', 'denotes', 'greatest', 'fractional',
  'part', 'satisfying', 'differentiable', 'point', 'local', 'maximum', 'simplifies'
]);

function autoWrapMathSegment(text) {
  if (typeof text !== 'string' || text.includes('$')) return text;

  const tokens = text.split(/(\s+)/);
  const isMathToken = new Array(tokens.length).fill(false);

  const mathAnchorRegex = /[=^_\\\/]|\b(?:sum|infty|frac|int)\b/u;
  const mathWords = /\b(sin|cos|tan|sec|cot|csc|ln|log|lim|dx|dt|dy|dz|du|dv|dθ|θ)\b/;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\s+$/.test(t)) continue;
    if (mathAnchorRegex.test(t) || mathWords.test(t)) {
      isMathToken[i] = true;
    }
  }

  const isContextToken = (t) => {
    if (/^\s+$/.test(t)) return true;
    
    // Don't merge option prefixes
    if (/^\([1-4]\)$/.test(t.trim())) return false;

    const cleanWord = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (blacklist.has(cleanWord)) return false;

    if (/^[a-zA-Z]{4,}$/.test(cleanWord) && !/\b(sinh|cosh|tanh|coth|sech|csch)\b/.test(cleanWord)) return false;

    return true;
  };

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
      if (mathBuffer.length === 0 && /^\s+$/.test(t)) {
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
  const segments = text.split(/((?:\.(?!\d))|[;\n\r]+)/);
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
    const pattern = /\$([^$]+)\$/g;
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

  const mathPattern = /(\$\$[^$]+\$\$|\$[^$]+\$|\\ce\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g;
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
          if (/^[\s=><+\-*/:,×xX]+$/.test(seg.value)) {
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

/** Quick check used to skip all math machinery for plain-text content. */
function containsMath(text) {
  if (typeof text !== 'string') return false;
  if (text.includes('$')) return true;
  
  const mathAnchorRegex = /[=^_\\\/]|\b(?:sum|infty|frac|int)\b/u;
  const mathWords = /\b(sin|cos|tan|sec|cot|csc|ln|log|lim|dx|dt|dy|dz|du|dv|dθ|θ)\b/;
  return mathAnchorRegex.test(text) || mathWords.test(text);
}

module.exports = { renderMath, parseSegments, containsMath };
