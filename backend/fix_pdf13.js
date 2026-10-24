const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

const formatterFunc = `
function formatQuestionTextForLayout(text) {
  if (!text) return "";
  const headingRegex = /(Statement ?[-:] ?\\d+|Assertion ?[A-Z]? ?[-:]|Reason ?[A-Z]? ?[-:])/gi;
  return text.replace(headingRegex, '\\n$1').trim();
}
`;

content = content.replace("function measureQuestionHeight", formatterFunc + "\nfunction measureQuestionHeight");
content = content.replace(/q\.questionText/g, "formatQuestionTextForLayout(q.questionText)");

fs.writeFileSync(file, content, "utf8");
