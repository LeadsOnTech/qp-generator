const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/TrialAccounts.jsx", "utf8");

const oldMsg = "`Hi! Try QuestionForge free ?\" generate your own question papers instantly.\\n\\nLogin: ${justGenerated.email}\\nPassword: ${justGenerated.password}\\n\\nYou get 200 free credits to test it out (1 credit = 1 question).`";
const newMsg = "`Hi! Try QuestionForge free — generate your own question papers instantly.\\n\\nWebsite: ${window.location.origin}\\nLogin: ${justGenerated.email}\\nPassword: ${justGenerated.password}\\n\\nYou get 200 free credits to test it out (1 credit = 1 question).`";

// First, check if there's any encoding stuff in the string we are searching for.
// It's safer to use a regex that matches the string loosely.
content = content.replace(/Hi! Try QuestionForge free.*?Login:.*?Password:.*?1 question\)\.`/s, 
"Hi! Try QuestionForge free — generate your own question papers instantly.\\n\\nWebsite: ${window.location.origin}\\nLogin: ${justGenerated.email}\\nPassword: ${justGenerated.password}\\n\\nYou get 200 free credits to test it out (1 credit = 1 question).`");

fs.writeFileSync("frontend/src/pages/TrialAccounts.jsx", content, "utf8");
