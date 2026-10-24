const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/upload.js", "utf8");

const deleteBatch = `
/**
 * DELETE /api/upload/batches/:id
 * Removes an upload batch log from the history.
 */
router.delete('/batches/:id', async (req, res) => {
  try {
    await prisma.uploadBatch.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: 'Batch not found' });
  }
});
`;

if (!content.includes("DELETE /api/upload/batches/:id")) {
  content = content.replace("module.exports = router;", deleteBatch + "\nmodule.exports = router;");
}

fs.writeFileSync("backend/src/routes/upload.js", content, "utf8");
