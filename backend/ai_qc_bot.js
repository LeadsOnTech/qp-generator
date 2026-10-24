const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

require('dotenv').config();
const API_KEY = process.env.GEMINI_API_KEY;

async function runQC() {
  if (!API_KEY) {
    console.error("ERROR: GEMINI_API_KEY is missing in your .env file!");
    process.exit(1);
  }

  const questions = await prisma.question.findMany({
    include: { chapter: { include: { subject: true } }, topic: true }
  });
  
  console.log(`Starting AI Quality Control on ${questions.length} questions...\n`);
  
  const reportFile = "QC_REPORT.txt";
  fs.writeFileSync(reportFile, "=== AI QUALITY CONTROL REPORT ===\n\n");

  let fixedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < questions.length; i += 5) {
    console.log(`Processing batch ${Math.floor(i/5) + 1} of ${Math.ceil(questions.length/5)} (Questions ${i+1} to ${Math.min(i+5, questions.length)})...`);
    const batch = questions.slice(i, i + 5);
    
    const prompt = `
You are a strict, expert JEE/NEET QC Auditor. Evaluate these 5 questions.
For each question, verify two things:
1. CATEGORIZATION: Is it in the most accurate standard JEE/NEET Chapter and Topic? (If not, provide the correct ones).
2. LOGIC: Does the mathematical solution actually match the correct option? Is the question scientifically sound?

Return ONLY a strict JSON array in this exact format (no markdown tags):
[
  { 
    "id": "question_id_here",
    "isChapterCorrect": true/false,
    "correctChapter": "string (only if false)",
    "correctTopic": "string (only if false)",
    "isLogicCorrect": true/false,
    "qcNotes": "Brief explanation of the logic error (only if false)"
  }
]

Input Questions:
${batch.map(q => `
ID: ${q.id}
Subject: ${q.chapter.subject.name} | Chapter: ${q.chapter.name} | Topic: ${q.topic?.name || 'None'}
Question: ${q.questionText}
Options: (A) ${q.optionA}, (B) ${q.optionB}, (C) ${q.optionC}, (D) ${q.optionD}
Correct Option: ${q.correctOption}
Solution: ${q.solutionText || 'None'}
`).join('\n')}
`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
        if (data.candidates && data.candidates[0].content.parts[0].text) {
        let text = data.candidates[0].content.parts[0].text.trim();
        const results = JSON.parse(text);
        
        for (const res of results) {
          const q = batch.find(b => b.id === res.id);
          if (!q) continue;

          // 1. Log Logic Errors to Report
          if (res.isLogicCorrect === false) {
            errorCount++;
            const log = `[FATAL ERROR] Question ID: ${q.id}\nQuestion: ${q.questionText.substring(0, 100)}...\nProblem: ${res.qcNotes}\n\n`;
            fs.appendFileSync(reportFile, log);
            console.log(`❌ Logic Error Found in question ${q.id}`);
          }

          // 2. Fix Categorization in Database
          if (res.isChapterCorrect === false && res.correctChapter) {
            // Find or create chapter
            let targetChapter = await prisma.chapter.findFirst({ where: { name: res.correctChapter } });
            if (!targetChapter) {
              targetChapter = await prisma.chapter.create({ data: { name: res.correctChapter, subjectId: q.chapter.subject.id } });
            }
            // Find or create topic
            let targetTopic = null;
            if (res.correctTopic) {
              targetTopic = await prisma.topic.findFirst({ where: { name: res.correctTopic, chapterId: targetChapter.id } });
              if (!targetTopic) {
                targetTopic = await prisma.topic.create({ data: { name: res.correctTopic, chapterId: targetChapter.id } });
              }
            }
            
            // Update DB
            await prisma.question.update({
              where: { id: q.id },
              data: { chapterId: targetChapter.id, topicId: targetTopic ? targetTopic.id : q.topicId }
            });
            fixedCount++;
            console.log(`✅ Moved question from '${q.chapter.name}' to '${res.correctChapter}'`);
          }
        }
      }
    } catch (e) {
      console.log("Error evaluating batch, skipping...", e.message);
    }
    
    // Respect API rate limits (15 requests per minute for free tier)
    await new Promise(r => setTimeout(r, 4500));
  }
  
  console.log(`\nQC COMPLETE!\nCategorization fixed: ${fixedCount} questions.\nLogic errors found: ${errorCount} questions (Check QC_REPORT.txt).`);
}

runQC().finally(() => prisma.$disconnect());
