const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/questions.js", "utf8");

content = content.replace(
  "await prisma.question.update({ where: { id: req.params.id }, data: { isActive: false } });",
  "const q = await prisma.question.findUnique({ where: { id: req.params.id }, include: { papers: true } });\n    if (q && q.papers && q.papers.length > 0) {\n      return res.status(400).json({ error: 'Cannot delete question: it is already used in one or more generated papers.' });\n    }\n    await prisma.question.delete({ where: { id: req.params.id } });"
);

content = content.replace(
  "router.delete('/:id', requireAdmin, async (req, res) => {",
  "router.delete('/:id', requireAuth, async (req, res) => {"
);

fs.writeFileSync("backend/src/routes/questions.js", content, "utf8");
