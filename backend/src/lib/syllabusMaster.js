const prisma = require('../db');

// Small in-request caches to avoid repeated DB round-trips while processing
// a batch of hundreds/thousands of rows.
function makeCaches() {
  return { exams: new Map(), subjects: new Map(), chapters: new Map(), topics: new Map() };
}

async function findOrCreateExam(name, caches) {
  const key = name.toLowerCase();
  if (caches.exams.has(key)) return caches.exams.get(key);
  let exam = await prisma.exam.findUnique({ where: { name } });
  if (!exam) exam = await prisma.exam.create({ data: { name } });
  caches.exams.set(key, exam);
  return exam;
}

async function findOrCreateSubject(name, examId, caches) {
  const key = `${examId}::${name.toLowerCase()}`;
  if (caches.subjects.has(key)) return caches.subjects.get(key);
  let subject = await prisma.subject.findUnique({ where: { name_examId: { name, examId } } });
  if (!subject) subject = await prisma.subject.create({ data: { name, examId } });
  caches.subjects.set(key, subject);
  return subject;
}

async function findOrCreateChapter(name, subjectId, caches) {
  const key = `${subjectId}::${name.toLowerCase()}`;
  if (caches.chapters.has(key)) return caches.chapters.get(key);
  // NOTE: new chapters default to ACTIVE. If this chapter name matches one
  // already marked REMOVED for this subject, we still find it (not re-create it),
  // so its syllabus status is preserved rather than silently reset to ACTIVE.
  let chapter = await prisma.chapter.findUnique({ where: { name_subjectId: { name, subjectId } } });
  if (!chapter) chapter = await prisma.chapter.create({ data: { name, subjectId } });
  caches.chapters.set(key, chapter);
  return chapter;
}

async function findOrCreateTopic(name, chapterId, caches) {
  if (!name) return null;
  const key = `${chapterId}::${name.toLowerCase()}`;
  if (caches.topics.has(key)) return caches.topics.get(key);
  let topic = await prisma.topic.findUnique({ where: { name_chapterId: { name, chapterId } } });
  if (!topic) topic = await prisma.topic.create({ data: { name, chapterId } });
  caches.topics.set(key, topic);
  return topic;
}

/**
 * Resolves (creating if needed) the Exam -> Subject -> Chapter -> Topic chain
 * for one validated row, and returns the chapter's current syllabus status
 * so the caller can decide whether to accept the question.
 */
async function resolveTaxonomy({ examName, subjectName, chapterName, topicName }, caches) {
  const exam = await findOrCreateExam(examName, caches);
  const subject = await findOrCreateSubject(subjectName, exam.id, caches);
  const chapter = await findOrCreateChapter(chapterName, subject.id, caches);
  const topic = await findOrCreateTopic(topicName, chapter.id, caches);
  return { exam, subject, chapter, topic };
}

module.exports = { makeCaches, resolveTaxonomy };
