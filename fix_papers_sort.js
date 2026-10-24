const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/papers.js", "utf8");

content = content.replace(
  "for (const [, list] of bySubject) ordered.push(...shuffle(list));",
  `for (const [, list] of bySubject) {
      const mcqs = list.filter(q => q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL');
      const nvqs = list.filter(q => q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL');
      ordered.push(...shuffle(mcqs));
      ordered.push(...shuffle(nvqs));
    }`
);

fs.writeFileSync("backend/src/routes/papers.js", content, "utf8");
