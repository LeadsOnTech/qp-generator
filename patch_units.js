const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

const replacement = `  // Simple fractions: a/b where a and b are numbers or simple variables (e.g. 1/e, \\pi/4, x/2)
  result = result.replace(/(\\\\[a-zA-Z]+\\{[^}]+\\}|[0-9a-zA-Z\\\\pi\\\\theta^_]+)\\/(\\\\[a-zA-Z]+\\{[^}]+\\}|[0-9a-zA-Z\\\\pi\\\\theta^_]+)/g, (match, num, den) => {
    if (num.startsWith('frac') || num.includes('frac') || den.includes('frac')) return match;
    // Exclude common physical units from being stacked vertically
    const units = /^(mol|mole|kg|g|mg|s|ms|m|cm|mm|nm|J|K|L|mL|N|Pa|atm|Hz|W|V|A|C|F|Omega)(?:\\^[+-]?\\d+)?$/i;
    if (units.test(den)) return match;
    return \`\\\\frac{\${num}}{\${den}}\`;
  });`;

content = content.replace(
  /\s*\/\/ Simple fractions:[\s\S]*?return `\\\\frac\{\$\{num\}\}\{\$\{den\}\}`;[\s\r\n]*\}\);/,
  "\n" + replacement
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
