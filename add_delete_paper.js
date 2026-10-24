const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/papers.js", "utf8");

const deleteCode = `
/**
 * DELETE /api/papers/:id
 * Delete a paper. Only allowed if you own it, or if admin.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const paper = await prisma.paper.findUnique({ where: { id: req.params.id } });
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });

    if (req.user.role !== 'ADMIN' && paper.instituteId !== req.user.instituteId) {
      return res.status(403).json({ error: 'Not authorized to delete this paper.' });
    }

    // Delete paper - Prisma cascade deletes paperQuestions if configured, else manual
    await prisma.paperQuestion.deleteMany({ where: { paperId: req.params.id } });
    await prisma.paper.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete paper error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
`;

if (!content.includes("router.delete('/:id'")) {
  content = content.replace("module.exports = router;", deleteCode + "\nmodule.exports = router;");
  fs.writeFileSync("backend/src/routes/papers.js", content, "utf8");
}
