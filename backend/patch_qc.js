const fs = require("fs");
const path = require("path");
let content = fs.readFileSync(path.join(__dirname, "ai_qc_bot.js"), "utf8");

if (!content.includes("console.log(`Processing batch")) {
  content = content.replace(
    /for \(let i = 0; i < questions\.length; i \+= 5\) \{/,
    `for (let i = 0; i < questions.length; i += 5) {\n    console.log(\`Processing batch \${Math.floor(i/5) + 1} of \${Math.ceil(questions.length/5)} (Questions \${i+1} to \${Math.min(i+5, questions.length)})...\`);`
  );
  fs.writeFileSync(path.join(__dirname, "ai_qc_bot.js"), content, "utf8");
}
