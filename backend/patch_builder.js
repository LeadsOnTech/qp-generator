const fs = require("fs");
const path = require("path");

const builderPath = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(builderPath, "utf8");

if (!content.includes("formatQuestionTextForLayout")) {
  const injection = `
function formatQuestionTextForLayout(text) {
  if (!text) return "";
  const headingRegex = /(?:\\s*)(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/gi;
  return text.replace(headingRegex, '\\n$1').trim();
}
`;

  content = content.replace("function measureQuestion", injection + "\nfunction measureQuestion");
  
  content = content.replace(
    /const leadingFraction = detectLeadingFraction\(q\.questionText\);/g,
    `const formattedText = formatQuestionTextForLayout(q.questionText);
  const leadingFraction = detectLeadingFraction(formattedText);`
  );
  
  content = content.replace(
    /textHeight = richMeasure\(doc, q\.questionText, colWidth - numWidth, 11\);/g,
    `textHeight = richMeasure(doc, formattedText, colWidth - numWidth, 11);`
  );

  content = content.replace(
    /textBottomY = richDraw\(doc, q\.questionText, x \+ numWidth, y, colWidth - numWidth, 11, INK\);/g,
    `textBottomY = richDraw(doc, formattedText, x + numWidth, y, colWidth - numWidth, 11, INK);`
  );

  fs.writeFileSync(builderPath, content, "utf8");
}
