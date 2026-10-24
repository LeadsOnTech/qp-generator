const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");

const oldStr = `      const wanted = splitCounts(subj.count, mix);
      const pickedForSubject = [];

      for (const level of ['EASY', 'MEDIUM', 'HARD']) {
        const bucket = byDifficulty[level];
        const take = Math.min(wanted[level], bucket.length);
        pickedForSubject.push(...bucket.splice(0, take));
        if (take < wanted[level]) {
          shortages.push({ subject: subj.name, difficulty: level, requested: wanted[level], got: take });
        }
      }

      // Graceful fallback: fill remaining slots from any leftover difficulty
      // (including UNTAGGED) in this subject, so the paper still reaches the
      // requested count when possible. Shortage entries above keep the record honest.
      let remaining = subj.count - pickedForSubject.length;
      if (remaining > 0) {
        const leftovers = shuffle([
          ...byDifficulty.EASY, ...byDifficulty.MEDIUM, ...byDifficulty.HARD, ...byDifficulty.UNTAGGED,
        ]);
        pickedForSubject.push(...leftovers.slice(0, remaining));
        remaining = subj.count - pickedForSubject.length;
        if (remaining > 0) {
          shortages.push({ subject: subj.name, difficulty: 'ANY', requested: subj.count, got: pickedForSubject.length });
        }
      }`;

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

if (!content.includes(oldStr)) {
  console.error("String not found!");
} else {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
  console.log("Successfully replaced");
}
