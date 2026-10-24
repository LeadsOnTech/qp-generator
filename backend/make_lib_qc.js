const fs = require("fs");
const path = require("path");

const script = `const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;

async function runAIBackgroundAudit(uploadBatchId) {
  if (!API_KEY) {
    console.log("[Auto-QC] Skipped: GEMINI_API_KEY not found in .env");
    return;
  }

  try {
    const questions = await prisma.question.findMany({
      where: { uploadBatchId },
      include: { chapter: { include: { subject: true } }, topic: true }
    });
    
    if (questions.length === 0) return;

    console.log(\`[Auto-QC] Starting background audit for \${questions.length} questions in batch \${uploadBatchId}...\`);

    const reportsDir = path.join(__dirname, '..', '..', 'QC_REPORTS');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    const reportFile = path.join(reportsDir, \`QC_REPORT_\${uploadBatchId}.txt\`);
    
    let errorCount = 0;
    let fixedCount = 0;

    for (let i = 0; i < questions.length; i += 5) {
      const batch = questions.slice(i, i + 5);
      
      const prompt = \`
You are an expert JEE/NEET QC Auditor. Evaluate these 5 questions.
1. CATEGORIZATION: Is it in the most accurate standard JEE/NEET Chapter and Topic? (If not, provide correct ones).
2. LOGIC: Does the mathematical solution match the correct option? Is the question scientifically sound?

Return ONLY a strict JSON array (no markdown) in this exact format:
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
\${batch.map(q => \`
ID: \${q.id}
Subject: \${q.chapter.subject.name} | Chapter: \${q.chapter.name} | Topic: \${q.topic?.name || 'None'}
Question: \${q.questionText}
Options: (A) \${q.optionA}, (B) \${q.optionB}, (C) \${q.optionC}, (D) \${q.optionD}
Correct Option: \${q.correctOption}
Solution: \${q.solutionText || 'None'}
\`).join('\\n')}
\`;

      try {
        const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${API_KEY}\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
          const results = JSON.parse(data.candidates[0].content.parts[0].text.trim());
          
          for (const res of results) {
            const q = batch.find(b => b.id === res.id);
            if (!q) continue;

            let finalState = 'BANK'; // move to active bank by default if good

            if (res.isLogicCorrect === false) {
              errorCount++;
              finalState = 'IN_QC'; // Keep it hidden from papers!
              const log = \`[FATAL ERROR] Question: \${q.questionText.substring(0, 100)}...\\nProblem: \${res.qcNotes}\\n\\n\`;
              if (!fs.existsSync(reportFile)) fs.writeFileSync(reportFile, "=== AI QUALITY CONTROL REPORT ===\\n\\n");
              fs.appendFileSync(reportFile, log);
            }

            let targetChapterId = q.chapterId;
            let targetTopicId = q.topicId;

            if (res.isChapterCorrect === false && res.correctChapter) {
              let targetChapter = await prisma.chapter.findFirst({ where: { name: res.correctChapter } });
              if (!targetChapter) {
                targetChapter = await prisma.chapter.create({ data: { name: res.correctChapter, subjectId: q.chapter.subject.id } });
              }
              targetChapterId = targetChapter.id;
              
              if (res.correctTopic) {
                let targetTopic = await prisma.topic.findFirst({ where: { name: res.correctTopic, chapterId: targetChapterId } });
                if (!targetTopic) {
                  targetTopic = await prisma.topic.create({ data: { name: res.correctTopic, chapterId: targetChapterId } });
                }
                targetTopicId = targetTopic.id;
              }
              fixedCount++;
            }

            await prisma.question.update({
              where: { id: q.id },
              data: { 
                chapterId: targetChapterId, 
                topicId: targetTopicId,
                workflowState: finalState
              }
            });
          }
        }
      } catch (e) {
        console.log("[Auto-QC] Error on batch:", e.message);
      }
      
      // Delay to respect rate limits
      await new Promise(r => setTimeout(r, 4500));
    }
    
    console.log(\`[Auto-QC] Finished batch \${uploadBatchId}. Fixed: \${fixedCount}, Errors: \${errorCount}\`);
  } catch (err) {
    console.error("[Auto-QC] Fatal error during audit:", err);
  }
}

module.exports = { runAIBackgroundAudit };
`;

fs.writeFileSync(path.join(__dirname, "src", "lib", "autoQCAuditor.js"), script, "utf8");
