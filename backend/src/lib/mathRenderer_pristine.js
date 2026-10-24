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
    const node = mathDocument.convert(latex, { display: displayMode });
    const svg = adaptor.innerHTML(node);

    // MathJax does not throw on malformed LaTeX — it renders a visible
    // error box (a <merror> node, typically with a red background) into
    // the output. Printing that onto a real student's exam paper would
    // look broken, so treat it as a failure and let the caller fall back
    // to showing the original text instead.
    if (svg.includes('data-mml-node="merror"') || svg.includes('data-mjx-error')) {
      renderCache.set(cacheKey, null);
      return null;
    }

    // MathJax puts the overall size on the root <svg> element's attributes
    // and the baseline offset in its inline style.
    const widthMatch = svg.match(/width="([\d.]+ex)"/);
    const heightMatch = svg.match(/height="([\d.]+ex)"/);
    const valignMatch = svg.match(/vertical-align:\s*(-?[\d.]+)ex/);

    const widthEx = widthMatch ? parseExValue(widthMatch[1]) : 0;
    const heightEx = heightMatch ? parseExValue(heightMatch[1]) : 0;
    // vertical-align is negative when the expression descends below the
    // baseline; depth is that descent as a positive number.
    const depthEx = valignMatch ? Math.max(0, -parseFloat(valignMatch[1])) : 0;

    const exToPt = fontSize * EX_TO_EM;

    const widthPt = widthEx * exToPt;
    const heightPt = heightEx * exToPt;

    // svg-to-pdfkit resolves the SVG's own "ex" width/height attributes
    // using its own font assumptions, which do not match the exToPt scale
    // used for measurement above — the result is an equation drawn at a
    // different size than the layout reserved space for, overlapping the
    // surrounding text. Rewriting the root attributes to explicit point
    // values removes the ambiguity entirely: what gets drawn is exactly
    // what was measured. The viewBox is left untouched so the artwork
    // still scales correctly into those dimensions.
    const normalizedSvg = svg
      .replace(/width="[\d.]+ex"/, `width="${widthPt}pt"`)
      .replace(/height="[\d.]+ex"/, `height="${heightPt}pt"`);

    result = {
      svg: normalizedSvg,
      width: widthPt,
      height: heightPt,
      depth: depthEx * exToPt,
    };
  } catch (err) {
    // Invalid LaTeX — signal failure so the caller can fall back to
    // rendering the raw text instead of producing a broken paper.
    result = null;
  }

  if (renderCache.size < MAX_CACHE_ENTRIES) renderCache.set(cacheKey, result);
  return result;
}

const subscriptMap = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₋': '-', 'ₐ': 'a', 'ₑ': 'e', '₊': '+', 'ₙ': 'n', 'ᵣ': 'r'
};

const superscriptMap = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁻': '-', '⁺': '+', 'ⁿ': 'n', 'ˣ': 'x', 'ʸ': 'y',
  'ⁱ': 'i'
};

function convertMathFormula(formula) {
  let result = formula;

  // Algebraic Sign Correction: Automatically simplify double negative signs (e.g. -- or - - to +)
  result = result.replace(/-\s*-/g, '+');

  // Spacing Constraints: Interpret tilde (~) as LaTeX non-breaking space
  result = result.replace(/~/g, '\\ ');

  // Map individual subscript characters to _{val}
  result = result.replace(/([₀₁₂₃₄₅₆₇₈₉₋ₐₑ₊ₙᵣ]+)/g, (match) => {
    const chars = match.split('').map(c => subscriptMap[c] || c).join('');
    return `_{${chars}}`;
  });

  // Map individual superscript characters to ^{val}
  result = result.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣʸⁱ]+)/g, (match) => {
    const chars = match.split('').map(c => superscriptMap[c] || c).join('');
    return `^{${chars}}`;
  });

  // Basic math symbols replacement
  const symbolMap = {
    '∫': '\\int',
    '√': '\\sqrt',
    'π': '\\pi',
    '→': '\\to',
    '∞': '\\infty',
    '∑': '\\sum',
    '∏': '\\prod',
    '⟹': '\\implies',
    '·': '\\cdot',
    '−': '-',
    '⌊': '\\lfloor ',
    '⌋': ' \\rfloor',
    'θ': '\\theta',
    'α': '\\alpha',
    'β': '\\beta',
    'λ': '\\lambda',
    '×': '\\times',
    '±': '\\pm',
    'μ': '\\mu',
    'σ': '\\sigma',
    'ρ': '\\rho',
    'ω': '\\omega',
    'φ': '\\phi',
    'ϕ': '\\varphi',
    'ψ': '\\psi',
    'η': '\\eta',
    'τ': '\\tau',
    'ε': '\\epsilon',
    'ϵ': '\\varepsilon',
    'δ': '\\delta',
    'γ': '\\gamma',
    'ν': '\\nu',
    'κ': '\\kappa',
    'χ': '\\chi',
    'Δ': '\\Delta',
    'Ω': '\\Omega',
    'Φ': '\\Phi',
    'Ψ': '\\Psi',
    'Σ': '\\Sigma',
    'Λ': '\\Lambda',
    'Θ': '\\Theta',
    '≈': '\\approx',
    '≠': '\\ne',
    '≤': '\\le',
    '≥': '\\ge',
    '∝': '\\propto',
    '°': '^\\circ',
    '∇': '\\nabla',
    '∂': '\\partial',
    'ℏ': '\\hbar',
    'Å': '\\text{Å}',
    'Å': '\\text{Å}',
    '℃': '^\\circ\\text{C}',
    '°C': '^\\circ\\text{C}'
  };

  // Sort symbols by length descending to match longer combinations first (e.g. °C before °)
  const sortedSymbols = Object.entries(symbolMap).sort((a, b) => b[0].length - a[0].length);

  for (const [uni, lat] of sortedSymbols) {
    if (lat.startsWith('\\') && /^[a-zA-Z]+$/.test(lat.substring(1))) {
      const regex = new RegExp(uni + '(?=[a-zA-Z])', 'g');
      result = result.replace(regex, lat + ' ');
    }
    result = result.split(uni).join(lat);
  }

  // Handle caret and underscore subscripts/superscripts with parenthesis
  // e.g. x^(3/2) -> x^{3/2}
  result = result.replace(/\^\(([^)]+)\)/g, '^{$1}');
  result = result.replace(/_\(([^)]+)\)/g, '_{$1}');

  // Root notation: \sqrt(expr) -> \sqrt{expr}
  result = result.replace(/\\sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
  result = result.replace(/\\sqrt\[([^\]]+)\]/g, '\\sqrt{$1}');
  result = result.replace(/\\sqrt\\([a-zA-Z]+)/g, '\\sqrt{\\$1}');
  result = result.replace(/\\sqrt([a-zA-Z0-9])/g, '\\sqrt{$1}');

  // Fractions: [ num / den ] -> \frac{num}{den}
  // Only replace [A/B] with \frac{A}{B} if the '/' is at the top-level of the bracket (not inside any parenthesis)
  let lastResult;
  do {
    lastResult = result;
    result = result.replace(/\[\s*([^/[\]]+?)\s*\/\s*([^/[\]]+?)\s*\]/g, (match, num, den) => {
      const openParensNum = (num.match(/\(/g) || []).length;
      const closeParensNum = (num.match(/\)/g) || []).length;
      const openParensDen = (den.match(/\(/g) || []).length;
      const closeParensDen = (den.match(/\)/g) || []).length;
      if (openParensNum !== closeParensNum || openParensDen !== closeParensDen) {
        return match;
      }
      return `\\frac{${num.trim()}}{${den.trim()}}`;
    });
  } while (result !== lastResult);

  // Parenthesized divisions: (num)/den, num/(den), (num)/(den)
  result = result.replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '\\frac{$1}{$2}');
  result = result.replace(/\(([^)]+)\)\/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\theta]+)/g, '\\frac{$1}{$2}');
  result = result.replace(/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\theta]+)\/\(([^)]+)\)/g, '\\frac{$1}{$2}');

  // Simple fractions: a/b where a and b are numbers or simple variables (e.g. 1/e, \pi/4, x/2)
  result = result.replace(/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\theta]+)\/(\\[a-zA-Z]+\{[^}]+\}|[0-9a-zA-Z\\pi\theta]+)/g, (match, num, den) => {
    if (num.startsWith('frac') || num.includes('frac') || den.includes('frac')) return match;
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

  const mathAnchorRegex = /[]/u;
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
      let mathStr = mathBuffer.join('');
      const leadingSpace = mathStr.match(/^\s*/)[0];
      const trailingSpace = mathStr.match(/\s*$/)[0];
      let mainMath = mathStr.substring(leadingSpace.length, mathStr.length - trailingSpace.length);

      const puncMatch = mainMath.match(/^(.*?)([,.;!?]*)$/s);
      let coreMath = puncMatch[1];
      let punc = puncMatch[2];

      if (coreMath.trim().length > 0) {
        resultParts.push(leadingSpace + `$${convertMathFormula(coreMath)}$` + punc + trailingSpace);
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

/**
 * Splits mixed content into an ordered list of segments:
 *   [{ type: 'text', value }, { type: 'math', value }, ...]
 */
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
      // autoWrapMath already calls convertMathFormula internally
      segments.push({ type: 'math', value: match[1] });
      localLast = match.index + match[0].length;
    }
    if (localLast < processed.length) {
      segments.push({ type: 'text', value: processed.slice(localLast) });
    }
  }

  // Match explicit math blocks ($$...$$, $...$, or \ce{...})
  // For \ce{}, we support simple nested braces by using a recursive-like pattern (up to 1 level of nesting)
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
    
    segments.push({ type: 'math', value: convertMathFormula(cleanMath) });
    lastIndex = offset + match.length;
  });

  if (lastIndex < text.length) {
    processAndPushText(text.slice(lastIndex));
  }

  return segments;
}

/** Quick check used to skip all math machinery for plain-text content. */
function containsMath(text) {
  if (typeof text !== 'string') return false;
  if (text.includes('$')) return true;
  
  const mathAnchorRegex = /[]/u;
  const mathWords = /\b(sin|cos|tan|sec|cot|csc|ln|log|lim|dx|dt|dy|dz|du|dv|dθ|θ)\b/;
  return mathAnchorRegex.test(text) || mathWords.test(text);
}

module.exports = { renderMath, parseSegments, containsMath };
