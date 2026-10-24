const fs = require("fs");
const lines = fs.readFileSync("C:/Users/Sharifuddin Shaik/.gemini/antigravity/brain/83239275-749b-41a2-8fea-0242efbef624/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (const line of lines) {
  if (!line) continue;
  const obj = JSON.parse(line);
  if (obj.content && obj.content.includes("function buildPaperPdf(") && obj.content.includes("function formatChemicalFormulas(")) {
    // This is a tool output containing the file.
    // It might be formatted with `> ` at the start of lines if it's from Select-String.
    // But if it's from `cat`, it's raw text.
    if (obj.content.length > 20000) {
       let code = obj.content;
       // If it starts with Output:\n, remove it
       if (code.startsWith("Output:\n")) code = code.substring(8);
       fs.writeFileSync("pdfBuilder_recovered_full.js", code);
       console.log("Recovered full file!");
       break;
    }
  }
}
