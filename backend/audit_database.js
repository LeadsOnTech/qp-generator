const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Ensure you have added GEMINI_API_KEY=your_key_here to your backend/.env file
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function auditQuestions() {
  if (!API_KEY) {
    console.error("ERROR: GEMINI_API_KEY is missing in your .env file!");
    console.log("Get a free key from: https://aistudio.google.com/app/apikey");
    process.exit(1);
  }

  console.log("Fetching questions from the database...");
  const questions = await prisma.question.findMany({
    include: { chapter: true, topic: true, chapter: { include: { subject: true } } }
  });
  
  console.log(`Found ${questions.length} questions. Starting AI Audit...\n`);

  // We will audit 10 questions at a time to be fast and avoid rate limits
  for (let i = 0; i < questions.length; i += 10) {
    const batch = questions.slice(i, i + 10);
    
    const prompt = `
You are an expert JEE/NEET professor. Evaluate the following questions and check if they are in the correct Chapter and Topic according to the standard Indian JEE/NEET syllabus.
Return a JSON array of objects with the exact same length and order as the input.
Format: [ { "isMisplaced": boolean, "correctChapter": "string", "correctTopic": "string" }, ... ]

Input Questions:
${batch.map((q, idx) => `[${idx}] Subject: ${q.chapter.subject.name} | Current Chapter: ${q.chapter.name} | Question: ${q.questionText.substring(0, 200)}...`).join('\n')}
`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const results = JSON.parse(data.candidates[0].content.parts[0].text);
        
        batch.forEach((q, idx) => {
          const res = results[idx];
          if (res && res.isMisplaced) {
            console.log(`[MISPLACED FOUND]`);
            console.log(`Question: ${q.questionText.substring(0, 50)}...`);
            console.log(`Current: ${q.chapter.name} -> New: ${res.correctChapter} (${res.correctTopic})\n`);
            
            // In the future, we can add auto-update logic here!
            // For now, it just prints a report so you can review it safely.
          }
        });
      }
    } catch (e) {
      console.error("Error asking AI:", e.message);
    }
    
    // Slight delay to respect free-tier rate limits (15 RPM)
    await new Promise(r => setTimeout(r, 4000));
  }
  
  console.log("Audit complete!");
}

auditQuestions().finally(() => prisma.$disconnect());
