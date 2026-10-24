const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");

content = content.replace(
  "questions.forEach((q, i) => {",
  `// Pre-process questions to inject section headers
  const renderItems = [];
  let currentSubject = null;
  let currentType = null;
  let qNumber = 1;
  questions.forEach((q) => {
    // Determine the type group (MCQ vs NVQ)
    const isNVQ = q.questionType === "NVQ" || q.questionType === "NUMERICAL" || q.questionType === "DECIMAL";
    const typeLabel = isNVQ ? "Numerical Value Questions" : "Multiple Choice Questions";
    // We don't have subject name on the generic q object in pdfBuilder unfortunately!
    // But we can just use the type change to insert a header if we only care about the type.
    if (currentType !== typeLabel) {
       currentType = typeLabel;
       renderItems.push({
         isHeader: true,
         text: "Section: " + typeLabel
       });
    }
    q._renderIndex = qNumber++;
    renderItems.push(q);
  });

  renderItems.forEach((q, i) => {`
);

content = content.replace(
  "const estimatedHeight = measureQuestionHeight(doc, q, index, colWidth);",
  "const index = q._renderIndex;\n    const estimatedHeight = measureQuestionHeight(doc, q, index, colWidth);"
);

content = content.replace(
  "const bottomY = drawQuestion(doc, q, index, colX[col], colY[col], colWidth);",
  "const bottomY = q.isHeader ? drawSectionHeader(doc, q.text, colX[col], colY[col], colWidth) : drawQuestion(doc, q, index, colX[col], colY[col], colWidth);"
);

content = content.replace(
  "function measureQuestionHeight(doc, q, index, colWidth) {",
  `function drawSectionHeader(doc, text, x, y, colWidth) {
  doc.font(FONT_BOLD).fontSize(12).fill(INK);
  doc.text(text, x, y + 4, { width: colWidth, align: 'center' });
  // draw a line under it
  doc.moveTo(x + 10, y + 20).lineTo(x + colWidth - 10, y + 20).strokeColor(SOFT).lineWidth(0.5).stroke();
  return y + 34;
}

function measureQuestionHeight(doc, q, index, colWidth) {
  if (q.isHeader) return 34;`
);

fs.writeFileSync("backend/src/lib/pdfBuilder.js", content, "utf8");
