const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");

content = content.replace(
  /const wanted = splitCounts\(subj\.count, mix\);\s*const pickedForSubject = \[\];\s*for \(const level of \['EASY', 'MEDIUM', 'HARD'\]\) \{[\s\S]*?\/\/ Graceful fallback: fill remaining slots[\s\S]*?pickedForSubject\.push\(\.\.\.fallback\.splice\(0, fallbackTake\)\);\s*\}/,
  `const pickedForSubject = [];
    
    // Pick MCQ and NVQ separately
    for (const qType of ['MCQ', 'NVQ']) {
      const qCount = qType === 'MCQ' ? subj.mcqCount : subj.nvqCount;
      if (!qCount || qCount <= 0) continue;
      
      const typeWanted = splitCounts(qCount, mix);
      
      // Filter byDifficulty to only include this type
      const typeBucket = { EASY: [], MEDIUM: [], HARD: [], UNTAGGED: [] };
      for (const level of Object.keys(byDifficulty)) {
        typeBucket[level] = byDifficulty[level].filter(q => qType === 'MCQ' ? q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL' : (q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL'));
      }

      for (const level of ['EASY', 'MEDIUM', 'HARD']) {
        const bucket = typeBucket[level];
        const take = Math.min(typeWanted[level], bucket.length);
        pickedForSubject.push(...bucket.splice(0, take));
        if (take < typeWanted[level]) {
          shortages.push({ subject: subj.name, type: qType, difficulty: level, requested: typeWanted[level], got: take });
        }
      }

      const totalPicked = pickedForSubject.filter(q => qType === 'MCQ' ? q.questionType !== 'NVQ' && q.questionType !== 'NUMERICAL' && q.questionType !== 'DECIMAL' : (q.questionType === 'NVQ' || q.questionType === 'NUMERICAL' || q.questionType === 'DECIMAL')).length;
      if (totalPicked < qCount) {
        const fallback = shuffle([...typeBucket.EASY, ...typeBucket.MEDIUM, ...typeBucket.HARD, ...typeBucket.UNTAGGED]);
        const fallbackTake = Math.min(qCount - totalPicked, fallback.length);
        pickedForSubject.push(...fallback.splice(0, fallbackTake));
      }
    }`
);

fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
