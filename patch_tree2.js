const fs = require("fs");
let content = fs.readFileSync("backend/src/routes/syllabus.js", "utf8");

const startStr = "router.get('/tree', async (req, res) => {";
const endStr = "  })));\n});";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find block", startIndex, endIndex);
  process.exit(1);
}

const newTreeRoute = `router.get('/tree', async (req, res) => {
  const { examName } = req.query;
  const where = {};
  if (examName) where.name = examName;

  const [exams, typeCounts] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: {
        subjects: {
          include: {
            chapters: {
              include: {
                _count: { 
                  select: { 
                    questions: {
                      where: { isActive: true }
                    } 
                  } 
                },
                topics: true,
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.question.groupBy({
      by: ['chapterId', 'questionType'],
      _count: true,
      where: { isActive: true }
    })
  ]);

  // Build a lookup map: chapterId -> { mcq: X, nvq: Y }
  const countsMap = {};
  for (const group of typeCounts) {
    if (!countsMap[group.chapterId]) countsMap[group.chapterId] = { mcq: 0, nvq: 0 };
    const qType = group.questionType;
    if (qType === 'NVQ' || qType === 'NUMERICAL' || qType === 'DECIMAL' || qType === 'NVT') {
      countsMap[group.chapterId].nvq += group._count;
    } else {
      // Treat everything else as MCQ
      countsMap[group.chapterId].mcq += group._count;
    }
  }

  res.json(exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    subjects: exam.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      chapters: s.chapters.map((c) => ({
        id: c.id,
        name: c.name,
        syllabusStatus: c.syllabusStatus,
        statusNote: c.statusNote,
        statusYear: c.statusYear,
        questionCount: c._count.questions,
        mcqCount: countsMap[c.id]?.mcq || 0,
        nvqCount: countsMap[c.id]?.nvq || 0,
        topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
      })),
    })),
  })));
});`;

content = content.substring(0, startIndex) + newTreeRoute + content.substring(endIndex + endStr.length);
fs.writeFileSync("backend/src/routes/syllabus.js", content, "utf8");
console.log("Success");
