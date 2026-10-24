const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/questions.js", "utf8");

content = content.replace(
  "'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption',",
  "'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption', 'solutionText',"
);

fs.writeFileSync("backend/src/routes/questions.js", content, "utf8");
