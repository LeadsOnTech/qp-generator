-- CreateTable
CREATE TABLE "RazorpayTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "signature" TEXT,
    "amountRupees" INTEGER NOT NULL,
    "creditsBought" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "RazorpayTransaction_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CbtTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "instituteId" TEXT,
    "title" TEXT NOT NULL,
    "examName" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "securityMode" TEXT NOT NULL DEFAULT 'STRICT_ROSTER',
    "examPin" TEXT,
    "rosterJson" TEXT,
    "allowSingleAttempt" BOOLEAN NOT NULL DEFAULT true,
    "tabSwitchLimit" INTEGER NOT NULL DEFAULT 3,
    "positiveMarks" REAL NOT NULL DEFAULT 4.0,
    "negativeMarks" REAL NOT NULL DEFAULT 1.0,
    "windowStartsAt" DATETIME,
    "windowEndsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "showSolutionsImmediate" BOOLEAN NOT NULL DEFAULT true,
    "isResultsReleased" BOOLEAN NOT NULL DEFAULT true,
    "isPublicWebsiteVisible" BOOLEAN NOT NULL DEFAULT false,
    "publicDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CbtTest_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CbtSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "studentPhone" TEXT,
    "section" TEXT,
    "isVerifiedStudent" BOOLEAN NOT NULL DEFAULT true,
    "token" TEXT,
    "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
    "answersJson" TEXT NOT NULL,
    "score" REAL NOT NULL DEFAULT 0.0,
    "maxScore" REAL NOT NULL DEFAULT 0.0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "unattemptedCount" INTEGER NOT NULL DEFAULT 0,
    "accuracyPercentage" REAL NOT NULL DEFAULT 0.0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    CONSTRAINT "CbtSubmission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CbtTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "gbpLink" TEXT,
    "businessCardUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuestionExamMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "difficultyOverride" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionExamMapping_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionExamMapping_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "section" TEXT,
    "classYear" TEXT,
    "courseTarget" TEXT,
    "admissionNumber" TEXT,
    "gender" TEXT,
    "photoUrl" TEXT,
    "nativePlace" TEXT,
    "district" TEXT,
    "state" TEXT,
    "hostelStatus" TEXT,
    "parentName" TEXT,
    "parentPhone" TEXT NOT NULL,
    "parentRelation" TEXT,
    "parentOccupation" TEXT,
    "parentEmail" TEXT,
    "studentPhone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentProfile_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "cbtTestId" TEXT,
    "studentProfileId" TEXT,
    "studentName" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "batchName" TEXT NOT NULL DEFAULT 'General',
    "section" TEXT,
    "parentPhone" TEXT,
    "examName" TEXT NOT NULL,
    "examType" TEXT NOT NULL DEFAULT 'CBT',
    "examDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "incorrectAnswers" INTEGER NOT NULL,
    "unattemptedQuestions" INTEGER NOT NULL,
    "maxMarks" REAL NOT NULL,
    "marksObtained" REAL NOT NULL,
    "negativeMarksDeducted" REAL NOT NULL DEFAULT 0.0,
    "percentage" REAL NOT NULL,
    "accuracyPercentage" REAL NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "totalStudents" INTEGER NOT NULL DEFAULT 1,
    "academicInsight" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamResult_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamResult_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamResult_cbtTestId_fkey" FOREIGN KEY ("cbtTestId") REFERENCES "CbtTest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExamResult_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSubjectResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "incorrectCount" INTEGER NOT NULL,
    "unattemptedCount" INTEGER NOT NULL,
    "maxMarks" REAL NOT NULL,
    "marksObtained" REAL NOT NULL,
    "accuracyPercentage" REAL NOT NULL,
    "percentage" REAL NOT NULL,
    CONSTRAINT "ExamSubjectResult_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ExamResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamChapterResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "chapterName" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "incorrectCount" INTEGER NOT NULL,
    "accuracyPercentage" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVERAGE',
    CONSTRAINT "ExamChapterResult_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ExamResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "firstViewedAt" DATETIME,
    "lastViewedAt" DATETIME,
    "expiresAt" DATETIME,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultAccessToken_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ExamResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "resultId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "templateName" TEXT NOT NULL DEFAULT 'student_exam_report_v1',
    "messagePayload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerMsgId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "costInRupees" REAL NOT NULL DEFAULT 0.75,
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppMessageLog_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WhatsAppMessageLog_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ExamResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppUsageLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "amountRupees" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppUsageLedger_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeWebsite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT,
    "customDomain" TEXT,
    "domainStatus" TEXT NOT NULL DEFAULT 'UNCONFIGURED',
    "sslStatus" TEXT NOT NULL DEFAULT 'NONE',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "publishedAt" DATETIME,
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "themeTemplate" TEXT NOT NULL DEFAULT 'CLASSIC_ACADEMIC',
    "primaryColor" TEXT NOT NULL DEFAULT '#1e40af',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0f766e',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "heroTitle" TEXT DEFAULT 'Empowering Future Leaders & Achievers',
    "heroSubtitle" TEXT DEFAULT 'Excellence in Academic Preparation, Competitive Ranks & Holistic Development',
    "heroBannerUrl" TEXT,
    "heroCtaText" TEXT DEFAULT 'Apply for Admission',
    "heroCtaLink" TEXT DEFAULT '#admissions',
    "displayName" TEXT,
    "mottoTagline" TEXT,
    "estYear" INTEGER,
    "accreditation" TEXT,
    "campusAddress" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "whatsappNumber" TEXT,
    "googleMapEmbedUrl" TEXT,
    "socialFacebook" TEXT,
    "socialInstagram" TEXT,
    "socialYoutube" TEXT,
    "socialLinkedin" TEXT,
    "socialTwitter" TEXT,
    "aboutTitle" TEXT DEFAULT 'Welcome to Our Institution',
    "aboutText" TEXT,
    "visionText" TEXT,
    "missionText" TEXT,
    "statsCountersJson" TEXT,
    "directorName" TEXT,
    "directorTitle" TEXT DEFAULT 'Director / Chairman',
    "directorPhotoUrl" TEXT,
    "directorMessage" TEXT,
    "directorQualifications" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImageUrl" TEXT,
    "hasOnlineExamModule" BOOLEAN NOT NULL DEFAULT true,
    "hasRecruitmentModule" BOOLEAN NOT NULL DEFAULT true,
    "hasCrmModule" BOOLEAN NOT NULL DEFAULT true,
    "hasAdvertisingModule" BOOLEAN NOT NULL DEFAULT false,
    "showStatsSection" BOOLEAN NOT NULL DEFAULT true,
    "showAboutSection" BOOLEAN NOT NULL DEFAULT true,
    "showDirectorSection" BOOLEAN NOT NULL DEFAULT true,
    "showWhyUsSection" BOOLEAN NOT NULL DEFAULT true,
    "showCoursesSection" BOOLEAN NOT NULL DEFAULT true,
    "showFacultySection" BOOLEAN NOT NULL DEFAULT true,
    "showMethodologySection" BOOLEAN NOT NULL DEFAULT true,
    "showFacilitiesSection" BOOLEAN NOT NULL DEFAULT true,
    "showResultsSection" BOOLEAN NOT NULL DEFAULT true,
    "showAdmissionsSection" BOOLEAN NOT NULL DEFAULT true,
    "showOpenExamsSection" BOOLEAN NOT NULL DEFAULT true,
    "showCareersSection" BOOLEAN NOT NULL DEFAULT true,
    "showGallerySection" BOOLEAN NOT NULL DEFAULT true,
    "showTestimonialsSection" BOOLEAN NOT NULL DEFAULT true,
    "showFaqSection" BOOLEAN NOT NULL DEFAULT true,
    "showContactFormSection" BOOLEAN NOT NULL DEFAULT true,
    "whyChooseUsJson" TEXT,
    "methodologyStepsJson" TEXT,
    "admissionProcessJson" TEXT,
    "scholarshipDetailsJson" TEXT,
    "faqsJson" TEXT,
    "promotionalBannerText" TEXT,
    "examFee" INTEGER NOT NULL DEFAULT 0,
    "upiId" TEXT,
    "upiQrUrl" TEXT,
    "payeeName" TEXT,
    "cbtPaymentInstructions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollegeWebsite_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetExam" TEXT,
    "duration" TEXT,
    "eligibility" TEXT,
    "description" TEXT,
    "syllabusOverview" TEXT,
    "highlightsJson" TEXT,
    "brochureFilename" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeCourse_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeFaculty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "experienceYrs" INTEGER,
    "photoUrl" TEXT,
    "bio" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeFaculty_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeFacility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeFacility_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "studentName" TEXT,
    "examOrAward" TEXT NOT NULL,
    "rankOrScore" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2025,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeAchievement_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeTestimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatarUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeTestimonial_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeGalleryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "title" TEXT,
    "category" TEXT NOT NULL DEFAULT 'CAMPUS',
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeGalleryItem_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeEnquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "parentName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "courseOfInterest" TEXT,
    "cityOrTown" TEXT,
    "academicYear" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "isCbtRegistration" BOOLEAN NOT NULL DEFAULT false,
    "cbtExamName" TEXT,
    "examFee" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'FREE',
    "utrNumber" TEXT,
    "paymentReceiptUrl" TEXT,
    "candidateRollNumber" TEXT,
    "candidatePassword" TEXT,
    "approvedAt" DATETIME,
    "whatsappSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeEnquiry_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeJobPosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "websiteId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "vacanciesCount" INTEGER NOT NULL DEFAULT 1,
    "minExperienceYrs" INTEGER NOT NULL DEFAULT 3,
    "requiredQualifications" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "location" TEXT,
    "applicationDeadline" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollegeJobPosting_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "CollegeWebsite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeJobApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobPostingId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "currentLocation" TEXT,
    "experienceYrs" INTEGER NOT NULL,
    "currentEmployer" TEXT,
    "expectedSalary" TEXT,
    "resumeFilename" TEXT NOT NULL,
    "coverLetter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "internalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollegeJobApplication_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "CollegeJobPosting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollegeSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceRupeesSnapshot" INTEGER NOT NULL,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "activatedByEmail" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollegeSubscription_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT,
    "instituteId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceRupeesSnapshot" INTEGER NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "performedByEmail" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CollegeSubscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionHistory_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instituteId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "moduleKey" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "baseAmountPaise" INTEGER NOT NULL,
    "taxAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "totalAmountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gatewayProvider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "gatewayOrderId" TEXT NOT NULL,
    "gatewayPaymentId" TEXT,
    "gatewaySignature" TEXT,
    "paymentMethod" TEXT,
    "gatewayFeePaise" INTEGER,
    "netSettledPaise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "failureReason" TEXT,
    "refundReference" TEXT,
    "refundStatus" TEXT,
    "refundAmountPaise" INTEGER,
    "refundedAt" DATETIME,
    "idempotencyKey" TEXT,
    "receiptNumber" TEXT,
    "requestedByEmail" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubscriptionPayment_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CollegeSubscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseAmountPaise" INTEGER NOT NULL,
    "taxableAmountPaise" INTEGER NOT NULL,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "taxAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "cgstAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "sgstAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "igstAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "totalAmountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "sacCode" TEXT,
    "collegeGstin" TEXT,
    "billingAddress" TEXT,
    "pdfPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubscriptionInvoice_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "SubscriptionPayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gatewayProvider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "errorDetails" TEXT,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Institute" (
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
    "trialPhoneNumber" TEXT,
    "trialPassword" TEXT,
    "whatsAppWalletBalance" REAL NOT NULL DEFAULT 0.0
);
INSERT INTO "new_Institute" ("address", "createdAt", "creditBalance", "id", "isTrial", "logoFilename", "name", "phone", "slug", "tagline", "trialPhoneNumber") SELECT "address", "createdAt", "creditBalance", "id", "isTrial", "logoFilename", "name", "phone", "slug", "tagline", "trialPhoneNumber" FROM "Institute";
DROP TABLE "Institute";
ALTER TABLE "new_Institute" RENAME TO "Institute";
CREATE UNIQUE INDEX "Institute_slug_key" ON "Institute"("slug");
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT,
    "workflowState" TEXT NOT NULL DEFAULT 'BANK',
    "uploadBatchId" TEXT,
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
    "optionAImage" TEXT,
    "optionBImage" TEXT,
    "optionCImage" TEXT,
    "optionDImage" TEXT,
    "sourceFileName" TEXT,
    "sourceRow" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Question_ownerInstituteId_fkey" FOREIGN KEY ("ownerInstituteId") REFERENCES "Institute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("aiConfidence", "aiEngine", "aiRationale", "aiSuggestedDifficulty", "chapterId", "checkEngine", "checkIssues", "checkStatus", "checkedAt", "correctOption", "createdAt", "difficulty", "difficultySource", "examSource", "examYear", "id", "imageFilename", "isActive", "lastUsedAt", "optionA", "optionB", "optionC", "optionD", "ownerInstituteId", "questionText", "questionType", "reviewStatus", "sharedGlobally", "solutionText", "sourceFileName", "sourceRow", "timesUsed", "topicId", "updatedAt", "verificationLevel") SELECT "aiConfidence", "aiEngine", "aiRationale", "aiSuggestedDifficulty", "chapterId", "checkEngine", "checkIssues", "checkStatus", "checkedAt", "correctOption", "createdAt", "difficulty", "difficultySource", "examSource", "examYear", "id", "imageFilename", "isActive", "lastUsedAt", "optionA", "optionB", "optionC", "optionD", "ownerInstituteId", "questionText", "questionType", "reviewStatus", "sharedGlobally", "solutionText", "sourceFileName", "sourceRow", "timesUsed", "topicId", "updatedAt", "verificationLevel" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayTransaction_orderId_key" ON "RazorpayTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayTransaction_paymentId_key" ON "RazorpayTransaction"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CbtTest_code_key" ON "CbtTest"("code");

-- CreateIndex
CREATE INDEX "CbtTest_paperId_idx" ON "CbtTest"("paperId");

-- CreateIndex
CREATE INDEX "CbtTest_code_idx" ON "CbtTest"("code");

-- CreateIndex
CREATE INDEX "CbtSubmission_testId_idx" ON "CbtSubmission"("testId");

-- CreateIndex
CREATE INDEX "CbtSubmission_rollNumber_idx" ON "CbtSubmission"("rollNumber");

-- CreateIndex
CREATE INDEX "CbtSubmission_testId_rollNumber_idx" ON "CbtSubmission"("testId", "rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppVerification_phone_key" ON "WhatsAppVerification"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_phone_key" ON "RegistrationRequest"("phone");

-- CreateIndex
CREATE INDEX "QuestionExamMapping_examId_idx" ON "QuestionExamMapping"("examId");

-- CreateIndex
CREATE INDEX "QuestionExamMapping_questionId_idx" ON "QuestionExamMapping"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionExamMapping_questionId_examId_key" ON "QuestionExamMapping"("questionId", "examId");

-- CreateIndex
CREATE INDEX "StudentProfile_instituteId_batchName_idx" ON "StudentProfile"("instituteId", "batchName");

-- CreateIndex
CREATE INDEX "StudentProfile_instituteId_courseTarget_idx" ON "StudentProfile"("instituteId", "courseTarget");

-- CreateIndex
CREATE INDEX "StudentProfile_parentPhone_idx" ON "StudentProfile"("parentPhone");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_instituteId_rollNumber_key" ON "StudentProfile"("instituteId", "rollNumber");

-- CreateIndex
CREATE INDEX "ExamResult_instituteId_rollNumber_idx" ON "ExamResult"("instituteId", "rollNumber");

-- CreateIndex
CREATE INDEX "ExamResult_paperId_idx" ON "ExamResult"("paperId");

-- CreateIndex
CREATE INDEX "ExamResult_batchName_idx" ON "ExamResult"("batchName");

-- CreateIndex
CREATE INDEX "ExamSubjectResult_resultId_idx" ON "ExamSubjectResult"("resultId");

-- CreateIndex
CREATE INDEX "ExamChapterResult_resultId_idx" ON "ExamChapterResult"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultAccessToken_token_key" ON "ResultAccessToken"("token");

-- CreateIndex
CREATE INDEX "ResultAccessToken_token_idx" ON "ResultAccessToken"("token");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_instituteId_status_idx" ON "WhatsAppMessageLog"("instituteId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_resultId_idx" ON "WhatsAppMessageLog"("resultId");

-- CreateIndex
CREATE INDEX "WhatsAppUsageLedger_instituteId_idx" ON "WhatsAppUsageLedger"("instituteId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_instituteId_key" ON "CollegeWebsite"("instituteId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_slug_key" ON "CollegeWebsite"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_subdomain_key" ON "CollegeWebsite"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_customDomain_key" ON "CollegeWebsite"("customDomain");

-- CreateIndex
CREATE INDEX "CollegeSubscription_instituteId_idx" ON "CollegeSubscription"("instituteId");

-- CreateIndex
CREATE INDEX "CollegeSubscription_moduleKey_status_idx" ON "CollegeSubscription"("moduleKey", "status");

-- CreateIndex
CREATE INDEX "CollegeSubscription_status_idx" ON "CollegeSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeSubscription_instituteId_moduleKey_key" ON "CollegeSubscription"("instituteId", "moduleKey");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_instituteId_idx" ON "SubscriptionHistory"("instituteId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_subscriptionId_idx" ON "SubscriptionHistory"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_moduleKey_idx" ON "SubscriptionHistory"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_gatewayOrderId_key" ON "SubscriptionPayment"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_gatewayPaymentId_key" ON "SubscriptionPayment"("gatewayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_idempotencyKey_key" ON "SubscriptionPayment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_receiptNumber_key" ON "SubscriptionPayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_instituteId_idx" ON "SubscriptionPayment"("instituteId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_idx" ON "SubscriptionPayment"("status");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_moduleKey_idx" ON "SubscriptionPayment"("moduleKey");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_gatewayOrderId_idx" ON "SubscriptionPayment"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_createdAt_idx" ON "SubscriptionPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_invoiceNumber_key" ON "SubscriptionInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_paymentId_key" ON "SubscriptionInvoice"("paymentId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_instituteId_idx" ON "SubscriptionInvoice"("instituteId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_invoiceNumber_idx" ON "SubscriptionInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_invoiceDate_idx" ON "SubscriptionInvoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookLog_eventId_key" ON "PaymentWebhookLog"("eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_gatewayOrderId_idx" ON "PaymentWebhookLog"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_gatewayPaymentId_idx" ON "PaymentWebhookLog"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_processingStatus_idx" ON "PaymentWebhookLog"("processingStatus");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_receivedAt_idx" ON "PaymentWebhookLog"("receivedAt");

