const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/exams.js", "utf8");

const deleteRoute = `
/**
 * DELETE /api/exams/:id
 * Hard deletes an exam and EVERYTHING associated with it (Questions, Papers, Subjects, Chapters).
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // 1. Delete all PaperQuestions and Papers related to this exam
    const papers = await prisma.paper.findMany({ where: { examName: exam.name }, select: { id: true } });
    const paperIds = papers.map(p => p.id);
    if (paperIds.length > 0) {
      await prisma.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } });
      await prisma.paper.deleteMany({ where: { id: { in: paperIds } } });
    }

    // 2. Find all subjects, chapters, questions
    const subjects = await prisma.subject.findMany({ where: { examId: id }, select: { id: true } });
    const subjectIds = subjects.map(s => s.id);

    if (subjectIds.length > 0) {
      const chapters = await prisma.chapter.findMany({ where: { subjectId: { in: subjectIds } }, select: { id: true } });
      const chapterIds = chapters.map(c => c.id);

      if (chapterIds.length > 0) {
        // Questions and Topics
        await prisma.paperQuestion.deleteMany({ where: { question: { chapterId: { in: chapterIds } } } }); // just in case
        await prisma.question.deleteMany({ where: { chapterId: { in: chapterIds } } });
        await prisma.topic.deleteMany({ where: { chapterId: { in: chapterIds } } });
        await prisma.chapter.deleteMany({ where: { id: { in: chapterIds } } });
      }
      await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
    }

    // 3. Delete Exam
    await prisma.exam.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!content.includes("DELETE /api/exams/:id")) {
  content = content.replace("module.exports = router;", deleteRoute + "\nmodule.exports = router;");
}

fs.writeFileSync("backend/src/routes/exams.js", content, "utf8");
