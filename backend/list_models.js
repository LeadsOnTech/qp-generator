require("dotenv").config();
const key = process.env.GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(r => r.json())
  .then(d => console.log(d.models.map(m => m.name).join("\n")));
