
$content = Get-Content backend/src/lib/pdfBuilder.js -Raw

$fixedSection = @"
function richDraw(doc, text, x, y, width, fontSize, color) {
  const value = text == null ? "" : String(text);
  if (!containsMath(value)) {
    doc.font(FONT_REGULAR).fontSize(fontSize).fill(color)
      .text(formatChemicalFormulas(value), x, y, { width, lineGap: 0 });
    return doc.y;
  }
  const { lines } = layoutRichText(doc, value, {
    width,
    fontSize,
    font: FONT_REGULAR,
    lineGap: 1,
    textTransform: formatChemicalFormulas,
  });
  return drawRichText(doc, lines, x, y, { fontSize, font: FONT_REGULAR, lineGap: 1, color });
}

function measureQuestionHeight(doc, q, index, colWidth) {
  const numWidth = 22;
  doc.font(FONT_REGULAR).fontSize(11);

  const leadingFraction = detectLeadingFraction(q.questionText);
  let textHeight;
  if (leadingFraction) {
    const glyph = measureFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, 11);
    const remainderWidth = colWidth - numWidth - glyph.width - FRACTION_GAP_AFTER;
    const remainderHeight = doc.heightOfString(formatChemicalFormulas(leadingFraction.remainder), { width: Math.max(remainderWidth, 40), lineGap: 0 });
    textHeight = Math.max(glyph.height, remainderHeight);
  } else {
    textHeight = richMeasure(doc, q.questionText, colWidth - numWidth, 11);
  }

  const image = resolveImage(doc, q, colWidth - 16);
  const imageHeight = image ? image.height + 4 : 0;

  let optionsHeight = 0;
  if (q.questionType === "DECIMAL" || q.questionType === "NUMERICAL") {
    optionsHeight = 30; 
  } else if (q.questionType === "MATRIX") {
    optionsHeight = 60;
  } else {
    const layoutType = getOptionsLayoutType(doc, q, colWidth);
    if (layoutType === "VERY_COMPACT") {
      const qw = (colWidth - numWidth - 4) / 4;
      optionsHeight = Math.max(14, ...["A","B","C","D"].map((k) => richMeasure(doc, q.options[k], qw, 11)));
    } else if (layoutType === "COMPACT") {
      const hw = (colWidth - numWidth - 4) / 2;
      const rowAB = Math.max(...["A","B"].map((k) => richMeasure(doc, q.options[k], hw, 11)));
      const rowCD = Math.max(...["C","D"].map((k) => richMeasure(doc, q.options[k], hw, 11)));
      optionsHeight = Math.max(14, rowAB) + Math.max(14, rowCD);
    } else {
      doc.font(FONT_REGULAR).fontSize(11);
      optionsHeight = ["A", "B", "C", "D"].reduce((sum, k) => {
        const numeral = { A: "1", B: "2", C: "3", D: "4" }[k];
        const label = q.questionType === "MULTI" ? `[ ]` : `(${numeral})`;
        const h = richMeasure(doc, `${label} ${q.options[k]}`, colWidth - numWidth - 4, 11);
        return sum + h + 1;
      }, 0);
    }
  }

  return textHeight + imageHeight + optionsHeight + 6;
}

function drawQuestion(doc, q, index, x, y, colWidth) {
  const numWidth = 22;
  doc.font(FONT_BOLD).fontSize(11);
  const prefix = `${index}. `;

  doc.fill(INK).text(prefix, x, y, { width: numWidth, lineBreak: false });

  const leadingFraction = detectLeadingFraction(q.questionText);
  let textBottomY;
  if (leadingFraction) {
    doc.font(FONT_REGULAR).fontSize(11);
    const glyphWidth = drawFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, x + numWidth, y, 11, INK);
    const remainderX = x + numWidth + glyphWidth + FRACTION_GAP_AFTER;
    const remainderWidth = colWidth - numWidth - glyphWidth - FRACTION_GAP_AFTER;
    doc.font(FONT_REGULAR).fontSize(11).fill(INK)
      .text(formatChemicalFormulas(leadingFraction.remainder), remainderX, y, { width: Math.max(remainderWidth, 40), lineGap: 0, align: "justify" });
    const glyphBottom = y + 11 * 1.9;
    textBottomY = Math.max(doc.y, glyphBottom);
  } else {
    textBottomY = richDraw(doc, q.questionText, x + numWidth, y, colWidth - numWidth, 11, INK);
  }

  let cursorY = textBottomY + 1;

  const image = resolveImage(doc, q, colWidth - 16);
  if (image) {
    doc.image(image.path, x + 8, cursorY, { width: image.width, height: image.height });
    cursorY += image.height + 4;
  }

  if (q.questionType === "DECIMAL" || q.questionType === "NUMERICAL") {
    // Just draw a simple blank box
    doc.rect(x + numWidth, cursorY + 4, 100, 20).stroke();
    cursorY += 30;
    return cursorY + 6;
  } else if (q.questionType === "MATRIX") {
    // Just leave space
    cursorY += 60;
    return cursorY + 6;
  }

  const numeralFor = { A: "1", B: "2", C: "3", D: "4" };
  const layoutType = getOptionsLayoutType(doc, q, colWidth);

  if (layoutType === "VERY_COMPACT") {
    const quarterWidth = (colWidth - numWidth - 4) / 4;
    let vcBottom = cursorY;
    ["A","B","C","D"].forEach((k, j) => {
      const label = q.questionType === "MULTI" ? `[ ]` : `(${j + 1})`;
      const b = richDraw(doc, `${label} ${q.options[k]}`, x + numWidth + quarterWidth * j, cursorY, quarterWidth, 11, SOFT);
      vcBottom = Math.max(vcBottom, b);
    });
    cursorY = Math.max(cursorY + 14, vcBottom);
  } else if (layoutType === "COMPACT") {
    const halfWidth = (colWidth - numWidth - 4) / 2;
    const labelA = q.questionType === "MULTI" ? `[ ]` : `(1)`;
    const labelB = q.questionType === "MULTI" ? `[ ]` : `(2)`;
    const labelC = q.questionType === "MULTI" ? `[ ]` : `(3)`;
    const labelD = q.questionType === "MULTI" ? `[ ]` : `(4)`;

    const bA = richDraw(doc, `${labelA} ${q.options.A}`, x + numWidth, cursorY, halfWidth, 11, SOFT);
    const bB = richDraw(doc, `${labelB} ${q.options.B}`, x + numWidth + halfWidth, cursorY, halfWidth, 11, SOFT);
    cursorY = Math.max(cursorY + 14, bA, bB);
    const bC = richDraw(doc, `${labelC} ${q.options.C}`, x + numWidth, cursorY, halfWidth, 11, SOFT);
    const bD = richDraw(doc, `${labelD} ${q.options.D}`, x + numWidth + halfWidth, cursorY, halfWidth, 11, SOFT);
    cursorY = Math.max(cursorY + 14, bC, bD);
  } else {
    for (const key of ["A", "B", "C", "D"]) {
      const label = q.questionType === "MULTI" ? `[ ]` : `(${numeralFor[key]})`;
      cursorY = richDraw(doc, `${label} ${q.options[key]}`, x + numWidth, cursorY, colWidth - numWidth - 4, 11, SOFT) + 1;
    }
  }

  return cursorY + 6;
}
"@

$indexStart = $content.IndexOf("function richDraw")
$indexEnd = $content.IndexOf("function layoutQuestionsTwoColumn")

$newContent = $content.Substring(0, $indexStart) + $fixedSection + "`n" + $content.Substring($indexEnd)
Set-Content backend/src/lib/pdfBuilder.js $newContent

