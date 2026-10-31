const SVGtoPDF = require('svg-to-pdfkit');
const { renderMath, parseSegments, containsMath } = require('./mathRenderer');

// ---------------------------------------------------------------------------
// Laying out text that contains inline equations.
//
// PDFKit's normal doc.text() can wrap plain words across lines, but it has
// no concept of an equation image sitting inline among those words. This
// module builds lines manually: it breaks the content into words and math
// expressions, measures each one, and packs them into lines that fit the
// available width — so a question reads as one continuous paragraph even
// when equations appear in the middle of a sentence.
// ---------------------------------------------------------------------------

/**
 * Builds a list of laid-out lines for mixed text/math content.
 *
 * Returns { lines, totalHeight } where each line is
 *   { items: [{type, ...}], height, baselineOffset }
 * `baselineOffset` is how far below the line's top edge the text baseline
 * sits, which is what keeps words and equations vertically aligned with
 * each other rather than each sitting at a different height.
 */
function layoutRichText(doc, text, options) {
    const {
    width,
    fontSize = 11,
    font,
    fontBold,
    lineGap = 2,
    textTransform = (t) => t,
  } = options;

  const headingRegex = /(Statement I\s*[:\.]|Statement II\s*[:\.]|Statement 1\s*[:\.]|Statement 2\s*[:\.]|Assertion\s*(?:\(A\))?\s*[:\.]|Reason\s*(?:\(R\))?\s*[:\.]|Statement-1\s*[:\.]|Statement-2\s*[:\.]|Statement - 1\s*[:\.]|Statement - 2\s*[:\.])/gi;

  // Sanitize accidental newlines inside parenthetical clauses (e.g. "(\n \alpha = 5 \n)" -> "( \alpha = 5 )")
  let cleanSourceText = typeof text === 'string'
    ? text.replace(/\(\s*[\r\n]+\s*/g, ' (').replace(/\s*[\r\n]+\s*\)/g, ') ')
    : text;

  if (typeof cleanSourceText === 'string') {
    // Prevent awkward hyphenation on coordinate axes (x-axis, y-axis, z-axis)
    cleanSourceText = cleanSourceText.replace(/\b([xyzXYZ0-9])\s*-\s*([aA]xis|[pP]lane|[rR]ay|[rR]ays|[jJ]unction|[gG]raph|[cC]urve)\b/g, '$1\u2011$2');
    // Prevent breaks on 1- or 2-letter prefixes (p-n, v-t, s-t, P-V, V-I, 1-D, 2-D)
    cleanSourceText = cleanSourceText.replace(/\b([a-zA-Z0-9]{1,2})-([a-zA-Z0-9]+)\b/g, '$1\u2011$2');
    // Prevent orphan opening brackets
    cleanSourceText = cleanSourceText.replace(/([\(\[\{])\s+/g, '$1\u00A0');
    // Ensure space before opening bracket if attached to preceding word: e.g. "about(" -> "about ("
    cleanSourceText = cleanSourceText.replace(/([a-zA-Z0-9])\(/g, '$1 (');
    // Prevent awkward space before closing punctuation marks (e.g. " )" -> ")", " ]" -> "]")
    cleanSourceText = cleanSourceText.replace(/\s+([\)\]\},;:\.\?!])/g, '$1');
  }

  const segments = parseSegments(cleanSourceText);
  const tokens = [];

  for (const segment of segments) {
    if (segment.type === 'math') {
      const rendered = renderMath(segment.value, fontSize);
      if (rendered) {
        tokens.push({ type: 'math', rendered, value: segment.value });
      } else {
        const fallback = "$" + segment.value + "$";
        for (const word of fallback.split(/([ \t\r\n]+)/)) {
          if (word.length) tokens.push({ type: 'text', value: word });
        }
      }
    } else {
      const transformed = textTransform(segment.value);
      
      const parts = transformed.split(headingRegex);
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        const type = (i % 2 === 1) ? 'bold' : 'text';
        for (const word of parts[i].split(/([ \t\r\n]+)/)) {
          if (word.length) tokens.push({ type, value: word });
        }
      }
    }
  }

  doc.font(font).fontSize(fontSize);
  const textHeight = doc.currentLineHeight();
  const textAscent = textHeight * 0.8; // approximate baseline position within a text line

  const lines = [];
  let current = { items: [], width: 0, maxAscent: textAscent, maxDescent: textHeight - textAscent };

    function pushLine(isLast = false) {
    if (current.items.length === 0) return;
    // Trim a trailing space so it doesn't affect alignment/width.
    while (current.items.length && current.items[current.items.length - 1].type === 'text'
           && /^[ \t\r\n]+$/.test(current.items[current.items.length - 1].value)) {
      current.width -= current.items.pop().width;
    }
    
    // Justify the line if requested, it's not the last line, and we have items
    if (options.align === 'justify' && !isLast && current.items.length > 1) {
      const extraSpace = width - current.width;
      // Only justify if the line is at least 60% full to prevent huge gaps
      if (extraSpace > 0 && extraSpace < width * 0.4) {
        const spaces = current.items.filter(item => item.type === 'text' && /^[ \t\r\n]+$/.test(item.value));
        if (spaces.length > 0) {
          const addPerSpace = extraSpace / spaces.length;
          if (addPerSpace <= 6) { // Strict cap: max 6 points stretch per space
            spaces.forEach(space => space.width += addPerSpace);
            current.width = width;
          }
        }
      }
    }

    current.height = current.maxAscent + current.maxDescent;
    current.baselineOffset = current.maxAscent;
    lines.push(current);
    current = { items: [], width: 0, maxAscent: textAscent, maxDescent: textHeight - textAscent };
  }

  for (const token of tokens) {
    let tokenWidth;
    let tokenAscent;
    let tokenDescent;

    if (token.type === 'math') {
      tokenWidth = token.rendered.width;
      tokenAscent = token.rendered.height - token.rendered.depth;
      tokenDescent = token.rendered.depth;

      // Automatically scale down math SVG if it exceeds the column width
      if (tokenWidth > width) {
        const scale = width / tokenWidth;
        token.rendered.width *= scale;
        token.rendered.height *= scale;
        token.rendered.depth *= scale;
        token.rendered.scale = scale;

        tokenWidth = token.rendered.width;
        tokenAscent = token.rendered.height - token.rendered.depth;
        tokenDescent = token.rendered.depth;
      }
        } else {
      doc.font(token.type === 'bold' && fontBold ? fontBold : font).fontSize(fontSize);
      tokenWidth = doc.widthOfString(token.value);
      tokenAscent = textAscent;
      tokenDescent = textHeight - textAscent;
    }

    const isWhitespace = token.type === 'text' && /^[ \t\r\n]+$/.test(token.value);

    if (token.type === 'text' && token.value.includes('\n')) {
      pushLine(true);
      const extraLines = (token.value.match(/\n/g) || []).length - 1;
      for (let i = 0; i < extraLines; i++) {
        current.items.push({ type: 'text', value: '', width: 0 });
        pushLine(true);
      }
      continue;
    }

    // A leading space on a fresh line is dropped rather than indenting it.
    if (isWhitespace && current.items.length === 0) continue;

    if (current.width + tokenWidth > width && current.items.length > 0) {
      const isClosingPunct = token.type === 'text' && /^[\)\]\},;:\.\?!]+$/.test(token.value.trim());
      let squeezed = false;

      // If adding a closing delimiter would overflow by a small amount,
      // squeeze it onto the current line by scaling down any math item or taking up to 5pt overflow,
      // rather than leaving a lonely ')' stranded on a line by itself!
      if (isClosingPunct) {
        const mathItem = current.items.find(it => it.type === 'math');
        const overflow = (current.width + tokenWidth) - width;
        if (mathItem && overflow > 0 && overflow <= 25) {
          const newMathW = mathItem.rendered.width - overflow - 1;
          const scale = newMathW / mathItem.rendered.width;
          mathItem.rendered.width *= scale;
          mathItem.rendered.height *= scale;
          mathItem.rendered.depth *= scale;
          mathItem.rendered.scale = (mathItem.rendered.scale || 1) * scale;
          current.width -= (overflow + 1);
          squeezed = true;
        } else if (overflow > 0 && overflow <= 5) {
          squeezed = true;
        }
      }

      if (!squeezed) {
        // Check if current.items ends with an opening delimiter (e.g. '(', '[', '{')
        // If so, pull it down to the next line so it never hangs alone at the end of a line!
        const carriedOver = [];
        while (current.items.length > 0) {
          const last = current.items[current.items.length - 1];
          if (last.type === 'text' && /^[ \t\r\n]+$/.test(last.value)) {
            current.width -= current.items.pop().width;
            continue;
          }
          if (last.type === 'text') {
            const m = last.value.match(/^([\s\S]*?)([\(\[\{])[\s\u00A0]*$/);
            if (m && m[2]) {
              const stem = m[1].trimEnd();
              const delim = m[2];
              doc.font(last.type === 'bold' && fontBold ? fontBold : font).fontSize(fontSize);
              const delimWidth = doc.widthOfString(delim);
              if (!stem) {
                current.width -= last.width;
                carriedOver.unshift({ type: last.type, value: delim, width: delimWidth });
                current.items.pop();
                continue;
              } else {
                const stemWidth = doc.widthOfString(stem);
                last.value = stem;
                current.width -= (last.width - stemWidth);
                last.width = stemWidth;
                carriedOver.unshift({ type: last.type, value: delim, width: delimWidth });
                continue;
              }
            }
          }
          break;
        }

        pushLine(false);

        if (carriedOver.length > 0) {
          for (const item of carriedOver) {
            current.items.push(item);
            current.width += item.width;
            current.maxAscent = Math.max(current.maxAscent, textAscent);
            current.maxDescent = Math.max(current.maxDescent, textHeight - textAscent);
          }
        }

        if (isWhitespace) continue; // don't start the new line with the space
      }
    }

    current.items.push({ ...token, width: tokenWidth });
    current.width += tokenWidth;
    current.maxAscent = Math.max(current.maxAscent, tokenAscent);
    current.maxDescent = Math.max(current.maxDescent, tokenDescent);
  }
  pushLine(true);

  const totalHeight = lines.reduce((sum, l) => sum + l.height + lineGap, 0);
  return { lines, totalHeight };
}

/**
 * Draws lines produced by layoutRichText at (x, y). Returns the y
 * coordinate just below the last line.
 */
function drawRichText(doc, lines, x, y, options) {
  const { fontSize = 11, font, lineGap = 2, color = '#000000' } = options;

  let cursorY = y;
  for (const line of lines) {
    let cursorX = x;
    for (const item of line.items) {
      if (item.type === 'math') {
        // Position so the equation's own baseline lands on the text baseline.
        const mathTop = cursorY + line.baselineOffset - (item.rendered.height - item.rendered.depth);
        try {
            // We no longer draw transparent LaTeX text behind the SVG for searchability
            // because some PDF viewers ignore fillOpacity(0) and render it visibly on top
            // of the math, creating garbled overlapping text like "Substitution tution".

          if (item.rendered.scale) {
            doc.save();
            doc.scale(item.rendered.scale, item.rendered.scale, { origin: [cursorX, mathTop] });
            SVGtoPDF(doc, item.rendered.svg, cursorX, mathTop);
            doc.restore();
          } else {
            SVGtoPDF(doc, item.rendered.svg, cursorX, mathTop);
          }
        } catch (err) {
          // Never let one equation break the whole paper.
        }
      } else {
        doc.font(item.type === 'bold' && options.fontBold ? options.fontBold : font).fontSize(fontSize).fill(color);
        // doc.text places by the top of the line box, so shift up by the
        // difference between this line's baseline and a plain text line's.
        const textTop = cursorY + line.baselineOffset - doc.currentLineHeight() * 0.8;
        doc.text(item.value, cursorX, textTop, { lineBreak: false, width: item.width + 2 });
      }
      cursorX += item.width;
    }
    cursorY += line.height + lineGap;
  }
  return cursorY;
}

module.exports = { layoutRichText, drawRichText, containsMath };
