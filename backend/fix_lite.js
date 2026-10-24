const fs = require("fs");
const path = require("path");

const auditorPath = path.join(__dirname, "src", "lib", "autoQCAuditor.js");
let content = fs.readFileSync(auditorPath, "utf8");
content = content.replace(/gemini-3\.5-flash/g, "gemini-3.5-flash-lite");
fs.writeFileSync(auditorPath, content, "utf8");

const scriptPath = path.join(__dirname, "ai_qc_bot.js");
if (fs.existsSync(scriptPath)) {
  let scriptContent = fs.readFileSync(scriptPath, "utf8");
  scriptContent = scriptContent.replace(/gemini-3\.5-flash/g, "gemini-3.5-flash-lite");
  fs.writeFileSync(scriptPath, scriptContent, "utf8");
}
