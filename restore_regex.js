const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(/const mathAnchorRegex = \/\[\]\/u;/g, "const mathAnchorRegex = /[₀₁₂₃₄₅₆₇₈₉₋ₐ₊ₙᵣ⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣʸⁱ∫√π→∞∑∏⟹·−⌊⌋θαβλ×±^=<>μσρωφϕψητεδγνκχΔΩΦΨΣΛΘ≈≠≤≥∝°∇∂ℏÅÅ℃]/u;");

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
console.log("Restored mathAnchorRegex");
