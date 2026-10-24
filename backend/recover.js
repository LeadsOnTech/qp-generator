const fs = require("fs");
const lines = fs.readFileSync("C:/Users/Sharifuddin Shaik/.gemini/antigravity/brain/83239275-749b-41a2-8fea-0242efbef624/.system_generated/logs/transcript_full.jsonl", "utf8").split("\n");
for (const line of lines) {
  if (!line) continue;
  const obj = JSON.parse(line);
  if (obj.tool_calls) {
    for (const call of obj.tool_calls) {
      if (call.function === "default_api:view_file" && call.arguments.AbsolutePath && call.arguments.AbsolutePath.includes("pdfBuilder.js")) {
        // Not useful unless we see the response
      }
    }
  }
  if (obj.content && obj.content.includes("function buildPaperPdf(")) {
    console.log("FOUND IT! Length:", obj.content.length);
    fs.writeFileSync("pdfBuilder_recovered.txt", obj.content);
  }
}
