-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patternSubjects" TEXT,
    "patternDifficultyMix" TEXT,
    "patternPaperType" TEXT
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "syllabusStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusNote" TEXT,
    "statusYear" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Institute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoFilename" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tagline" TEXT,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialPhoneNumber" TEXT
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RechargeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "amountRupees" INTEGER NOT NULL,
    "creditsAsked" INTEGER NOT NULL,
    "upiReference" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedByEmail" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "creditTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RechargeRequest_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "instituteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "resetTokenHash" TEXT,
    "resetTokenExpiry" DATETIME,
    CONSTRAINT "User_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "solutionText" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'MCQ',
    "examYear" INTEGER,
    "examSource" TEXT,
    "chapterId" TEXT NOT NULL,
    "topicId" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'UNTAGGED',
    "difficultySource" TEXT NOT NULL DEFAULT 'NONE',
    "ownerInstituteId" TEXT,
    "sharedGlobally" BOOLEAN NOT NULL DEFAULT true,
    "verificationLevel" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "aiSuggestedDifficulty" TEXT,
    "aiConfidence" REAL,
    "aiRationale" TEXT,
    "aiEngine" TEXT,
    "reviewStatus" TEXT,
    "checkStatus" TEXT,
    "checkIssues" TEXT,
    "checkEngine" TEXT,
    "checkedAt" DATETIME,
    "imageFilename" TEXT,
    "sourceFileName" TEXT,
    "sourceRow" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Question_ownerInstituteId_fkey" FOREIGN KEY ("ownerInstituteId") REFERENCES "Institute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "uploadedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "instituteName" TEXT,
    "instituteId" TEXT,
    "examName" TEXT NOT NULL,
    "paperType" TEXT NOT NULL DEFAULT 'DPP',
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "includeSolutions" BOOLEAN NOT NULL DEFAULT false,
    "shortagesNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" DATETIME,
    CONSTRAINT "Paper_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaperQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paperId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "PaperQuestion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaperQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Exam_name_key" ON "Exam"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_examId_key" ON "Subject"("name", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_name_subjectId_key" ON "Chapter"("name", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_chapterId_key" ON "Topic"("name", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_slug_key" ON "Institute"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PaperQuestion_paperId_questionId_key" ON "PaperQuestion"("paperId", "questionId");
