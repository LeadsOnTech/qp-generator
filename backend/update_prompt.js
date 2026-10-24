const fs = require("fs");
const path = require("path");

const auditorPath = path.join(__dirname, "src", "lib", "autoQCAuditor.js");
let content = fs.readFileSync(auditorPath, "utf8");

const oldPrompt = `You are an expert JEE/NEET QC Auditor. Evaluate these 5 questions.
1. CATEGORIZATION: Is it in the most accurate standard JEE/NEET Chapter and Topic? (If not, provide correct ones).
2. LOGIC: Does the mathematical solution match the correct option? Is the question scientifically sound?`;

const newPrompt = `You are an expert JEE/NEET QC Auditor. Evaluate these 5 questions following these STRICT rules:
1. CATEGORIZATION: Is it in the most accurate standard JEE/NEET Chapter and Topic? (If not, provide correct ones).
2. LOGIC & DATA: Re-solve every question independently and validate all four options. Reject any question with missing data, multiple correct options, or no correct option.
3. MATCH: Does the mathematical solution exactly match the correct option?`;

content = content.replace(oldPrompt, newPrompt);
fs.writeFileSync(auditorPath, content, "utf8");
