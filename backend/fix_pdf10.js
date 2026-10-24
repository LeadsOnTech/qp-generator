const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

const headerFunc = `
function drawSectionHeader(doc, text, x, y, colWidth) {
  doc.font(FONT_BOLD).fontSize(12).fill('#1e293b');
  doc.text(text, x, y + 4, { width: colWidth, align: 'center' });
  // draw a line under it
  doc.moveTo(x + 10, y + 20).lineTo(x + colWidth - 10, y + 20).strokeColor('#94a3b8').lineWidth(0.5).stroke();
  return y + 34;
}
`;

content = content.replace("function measureQuestionHeight", headerFunc + "\nfunction measureQuestionHeight");

fs.writeFileSync(file, content, "utf8");
