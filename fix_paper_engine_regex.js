const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");

const regex = /const wanted = splitCounts\(subj\.count, mix\);[\s\S]*?const pickedForSubject = \[\];[\s\S]*?for \(const level of \['EASY', 'MEDIUM', 'HARD'\]\) \{[\s\S]*?\}[\s\S]*?let remaining = subj\.count - pickedForSubject\.length;[\s\S]*?if \(remaining > 0\) \{[\s\S]*?\}\s*\}/;

const newStr = `      const pickedForSubject = [];
      
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
        let remaining = qCount - totalPicked;
        if (remaining > 0) {
          const leftovers = shuffle([
            ...typeBucket.EASY, ...typeBucket.MEDIUM, ...typeBucket.HARD, ...typeBucket.UNTAGGED,
          ]);
          pickedForSubject.push(...leftovers.slice(0, remaining));
          remaining = qCount - (totalPicked + leftovers.slice(0, remaining).length);
          if (remaining > 0) {
            shortages.push({ subject: subj.name, type: qType, difficulty: 'ANY', requested: qCount, got: qCount - remaining });
          }
        }
      }`;

if (regex.test(content)) {
  content = content.replace(regex, newStr);
  fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
  console.log("Successfully replaced");
} else {
  console.log("Not found with regex");
}
