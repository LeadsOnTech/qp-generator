const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

const API_KEY = process.env.GEMINI_API_KEY;
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

async function runAIBackgroundAudit(uploadBatchId) {
  if (!API_KEY && !CLAUDE_KEY) {
    console.log("[Auto-QC] Skipped: Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY found in .env");
    return;
  }

  try {
    const questions = await prisma.question.findMany({
      where: { uploadBatchId },
      include: { chapter: { include: { subject: true } }, topic: true }
    });
    
    if (questions.length === 0) return;

    console.log(`[Auto-QC] Starting background audit for ${questions.length} questions in batch ${uploadBatchId}...`);

    const reportsDir = path.join(__dirname, '..', '..', 'QC_REPORTS');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    const reportFile = path.join(reportsDir, `QC_REPORT_${uploadBatchId}.txt`);
    
    let errorCount = 0;
    let fixedCount = 0;

    for (let i = 0; i < questions.length; i += 5) {
      const batch = questions.slice(i, i + 5);
      
      const prompt = `
You are an expert JEE/NEET QC Auditor. Evaluate these 5 questions following these STRICT rules:
1. CATEGORIZATION: Is it in the most accurate standard JEE/NEET Chapter and Topic? (If not, provide correct ones).
2. LOGIC & DATA: Re-solve every question independently and validate all four options. Reject any question with missing data, multiple correct options, or no correct option.
3. MATCH: Does the mathematical solution exactly match the correct option?

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
        let results = null;
        
        if (CLAUDE_KEY) {
          // Use Claude for superior accuracy
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': CLAUDE_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-latest',
              max_tokens: 2000,
              system: 'You are an expert JEE/NEET QC Auditor. Return ONLY a strict JSON array (no markdown tags, no markdown blocks, just raw JSON).',
              messages: [{ role: 'user', content: prompt }]
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          if (data.content && data.content[0].text) {
             let text = data.content[0].text.trim();
             // Remove markdown code blocks if Claude includes them despite instructions
             if (text.startsWith('```json')) text = text.slice(7);
             if (text.startsWith('```')) text = text.slice(3);
             if (text.endsWith('```')) text = text.slice(0, -3);
             results = JSON.parse(text.trim());
          }
        } else {
          // Fallback to Gemini
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
             results = JSON.parse(data.candidates[0].content.parts[0].text.trim());
          }
        }

        if (results) {
          
          for (const res of results) {
            const q = batch.find(b => b.id === res.id);
            if (!q) continue;

            let finalState = 'BANK'; // move to active bank by default if good

            if (res.isLogicCorrect === false) {
              errorCount++;
              finalState = 'IN_QC'; // Keep it hidden from papers!
              const log = `[FATAL ERROR] Question: ${q.questionText.substring(0, 100)}...\nProblem: ${res.qcNotes}\n\n`;
              if (!fs.existsSync(reportFile)) fs.writeFileSync(reportFile, "=== AI QUALITY CONTROL REPORT ===\n\n");
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
                workflowState: finalState,
                checkStatus: res.isLogicCorrect === false ? 'FLAGGED' : 'PASSED',
                checkIssues: res.isLogicCorrect === false ? JSON.stringify([res.qcNotes || 'Logic error detected by AI audit']) : null,
                checkedAt: new Date(),
                checkEngine: CLAUDE_KEY ? 'CLAUDE' : 'GEMINI',
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
    
    console.log(`[Auto-QC] Finished batch ${uploadBatchId}. Fixed: ${fixedCount}, Errors: ${errorCount}`);
  } catch (err) {
    console.error("[Auto-QC] Fatal error during audit:", err);
  }
}

module.exports = { runAIBackgroundAudit };
