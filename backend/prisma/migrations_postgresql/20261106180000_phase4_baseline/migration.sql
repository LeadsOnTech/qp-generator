-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Exam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patternSubjects" TEXT,
    "patternDifficultyMix" TEXT,
    "patternPaperType" TEXT,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Chapter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "syllabusStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusNote" TEXT,
    "statusYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Institute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoFilename" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tagline" TEXT,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialPhoneNumber" TEXT,
    "trialPassword" TEXT,
    "whatsAppWalletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreditTransaction" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RechargeRequest" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "amountRupees" INTEGER NOT NULL,
    "creditsAsked" INTEGER NOT NULL,
    "upiReference" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedByEmail" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "creditTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RechargeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RazorpayTransaction" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "signature" TEXT,
    "amountRupees" INTEGER NOT NULL,
    "creditsBought" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RazorpayTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "instituteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "resetTokenHash" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
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
    "lastUsedAt" TIMESTAMP(3),
    "aiSuggestedDifficulty" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiRationale" TEXT,
    "aiEngine" TEXT,
    "reviewStatus" TEXT,
    "checkStatus" TEXT,
    "checkIssues" TEXT,
    "checkEngine" TEXT,
    "checkedAt" TIMESTAMP(3),
    "imageFilename" TEXT,
    "optionAImage" TEXT,
    "optionBImage" TEXT,
    "optionCImage" TEXT,
    "optionDImage" TEXT,
    "sourceFileName" TEXT,
    "sourceRow" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UploadBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Paper" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instituteName" TEXT,
    "instituteId" TEXT,
    "examName" TEXT NOT NULL,
    "paperType" TEXT NOT NULL DEFAULT 'DPP',
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "includeSolutions" BOOLEAN NOT NULL DEFAULT false,
    "shortagesNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaperQuestion" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CbtTest" (
    "id" TEXT NOT NULL,
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
    "positiveMarks" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "negativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "windowStartsAt" TIMESTAMP(3),
    "windowEndsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "showSolutionsImmediate" BOOLEAN NOT NULL DEFAULT true,
    "isResultsReleased" BOOLEAN NOT NULL DEFAULT true,
    "isPublicWebsiteVisible" BOOLEAN NOT NULL DEFAULT false,
    "publicDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CbtTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CbtSubmission" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "studentPhone" TEXT,
    "section" TEXT,
    "isVerifiedStudent" BOOLEAN NOT NULL DEFAULT true,
    "token" TEXT,
    "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
    "answersJson" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "unattemptedCount" INTEGER NOT NULL DEFAULT 0,
    "accuracyPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',

    CONSTRAINT "CbtSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppVerification" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistrationRequest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "gbpLink" TEXT,
    "businessCardUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionExamMapping" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "difficultyOverride" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionExamMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentProfile" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExamResult" (
    "id" TEXT NOT NULL,
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
    "examDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "incorrectAnswers" INTEGER NOT NULL,
    "unattemptedQuestions" INTEGER NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "negativeMarksDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "percentage" DOUBLE PRECISION NOT NULL,
    "accuracyPercentage" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "totalStudents" INTEGER NOT NULL DEFAULT 1,
    "academicInsight" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExamSubjectResult" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "incorrectCount" INTEGER NOT NULL,
    "unattemptedCount" INTEGER NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "accuracyPercentage" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ExamSubjectResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExamChapterResult" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "chapterName" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "attemptedQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "incorrectCount" INTEGER NOT NULL,
    "accuracyPercentage" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVERAGE',

    CONSTRAINT "ExamChapterResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResultAccessToken" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "resultId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "templateName" TEXT NOT NULL DEFAULT 'student_exam_report_v1',
    "messagePayload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerMsgId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "costInRupees" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppUsageLedger" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "amountRupees" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeWebsite" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT,
    "customDomain" TEXT,
    "domainStatus" TEXT NOT NULL DEFAULT 'UNCONFIGURED',
    "sslStatus" TEXT NOT NULL DEFAULT 'NONE',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "publishedAt" TIMESTAMP(3),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeCourse" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeFaculty" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "experienceYrs" INTEGER,
    "photoUrl" TEXT,
    "bio" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeFaculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeFacility" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeAchievement" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "studentName" TEXT,
    "examOrAward" TEXT NOT NULL,
    "rankOrScore" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2025,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeTestimonial" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatarUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeGalleryItem" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "title" TEXT,
    "category" TEXT NOT NULL DEFAULT 'CAMPUS',
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeGalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeEnquiry" (
    "id" TEXT NOT NULL,
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
    "approvedAt" TIMESTAMP(3),
    "whatsappSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeJobPosting" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "vacanciesCount" INTEGER NOT NULL DEFAULT 1,
    "minExperienceYrs" INTEGER NOT NULL DEFAULT 3,
    "requiredQualifications" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "location" TEXT,
    "applicationDeadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeJobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeJobApplication" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeJobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeSubscription" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceRupeesSnapshot" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "activatedByEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "instituteId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priceRupeesSnapshot" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "performedByEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionPayment" (
    "id" TEXT NOT NULL,
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
    "paidAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "refundReference" TEXT,
    "refundStatus" TEXT,
    "refundAmountPaise" INTEGER,
    "refundedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "receiptNumber" TEXT,
    "requestedByEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentWebhookLog" (
    "id" TEXT NOT NULL,
    "gatewayProvider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorDetails" TEXT,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exam_name_key" ON "public"."Exam"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_examId_key" ON "public"."Subject"("name", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_name_subjectId_key" ON "public"."Chapter"("name", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_chapterId_key" ON "public"."Topic"("name", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_slug_key" ON "public"."Institute"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayTransaction_orderId_key" ON "public"."RazorpayTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayTransaction_paymentId_key" ON "public"."RazorpayTransaction"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PaperQuestion_paperId_questionId_key" ON "public"."PaperQuestion"("paperId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CbtTest_code_key" ON "public"."CbtTest"("code");

-- CreateIndex
CREATE INDEX "CbtTest_paperId_idx" ON "public"."CbtTest"("paperId");

-- CreateIndex
CREATE INDEX "CbtTest_code_idx" ON "public"."CbtTest"("code");

-- CreateIndex
CREATE INDEX "CbtSubmission_testId_idx" ON "public"."CbtSubmission"("testId");

-- CreateIndex
CREATE INDEX "CbtSubmission_rollNumber_idx" ON "public"."CbtSubmission"("rollNumber");

-- CreateIndex
CREATE INDEX "CbtSubmission_testId_rollNumber_idx" ON "public"."CbtSubmission"("testId", "rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppVerification_phone_key" ON "public"."WhatsAppVerification"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_phone_key" ON "public"."RegistrationRequest"("phone");

-- CreateIndex
CREATE INDEX "QuestionExamMapping_examId_idx" ON "public"."QuestionExamMapping"("examId");

-- CreateIndex
CREATE INDEX "QuestionExamMapping_questionId_idx" ON "public"."QuestionExamMapping"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionExamMapping_questionId_examId_key" ON "public"."QuestionExamMapping"("questionId", "examId");

-- CreateIndex
CREATE INDEX "StudentProfile_instituteId_batchName_idx" ON "public"."StudentProfile"("instituteId", "batchName");

-- CreateIndex
CREATE INDEX "StudentProfile_instituteId_courseTarget_idx" ON "public"."StudentProfile"("instituteId", "courseTarget");

-- CreateIndex
CREATE INDEX "StudentProfile_parentPhone_idx" ON "public"."StudentProfile"("parentPhone");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_instituteId_rollNumber_key" ON "public"."StudentProfile"("instituteId", "rollNumber");

-- CreateIndex
CREATE INDEX "ExamResult_instituteId_rollNumber_idx" ON "public"."ExamResult"("instituteId", "rollNumber");

-- CreateIndex
CREATE INDEX "ExamResult_paperId_idx" ON "public"."ExamResult"("paperId");

-- CreateIndex
CREATE INDEX "ExamResult_batchName_idx" ON "public"."ExamResult"("batchName");

-- CreateIndex
CREATE INDEX "ExamSubjectResult_resultId_idx" ON "public"."ExamSubjectResult"("resultId");

-- CreateIndex
CREATE INDEX "ExamChapterResult_resultId_idx" ON "public"."ExamChapterResult"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultAccessToken_token_key" ON "public"."ResultAccessToken"("token");

-- CreateIndex
CREATE INDEX "ResultAccessToken_token_idx" ON "public"."ResultAccessToken"("token");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_instituteId_status_idx" ON "public"."WhatsAppMessageLog"("instituteId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_resultId_idx" ON "public"."WhatsAppMessageLog"("resultId");

-- CreateIndex
CREATE INDEX "WhatsAppUsageLedger_instituteId_idx" ON "public"."WhatsAppUsageLedger"("instituteId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_instituteId_key" ON "public"."CollegeWebsite"("instituteId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_slug_key" ON "public"."CollegeWebsite"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_subdomain_key" ON "public"."CollegeWebsite"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeWebsite_customDomain_key" ON "public"."CollegeWebsite"("customDomain");

-- CreateIndex
CREATE INDEX "CollegeSubscription_instituteId_idx" ON "public"."CollegeSubscription"("instituteId");

-- CreateIndex
CREATE INDEX "CollegeSubscription_moduleKey_status_idx" ON "public"."CollegeSubscription"("moduleKey", "status");

-- CreateIndex
CREATE INDEX "CollegeSubscription_status_idx" ON "public"."CollegeSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeSubscription_instituteId_moduleKey_key" ON "public"."CollegeSubscription"("instituteId", "moduleKey");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_instituteId_idx" ON "public"."SubscriptionHistory"("instituteId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_subscriptionId_idx" ON "public"."SubscriptionHistory"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_moduleKey_idx" ON "public"."SubscriptionHistory"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_gatewayOrderId_key" ON "public"."SubscriptionPayment"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_gatewayPaymentId_key" ON "public"."SubscriptionPayment"("gatewayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_idempotencyKey_key" ON "public"."SubscriptionPayment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_receiptNumber_key" ON "public"."SubscriptionPayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_instituteId_idx" ON "public"."SubscriptionPayment"("instituteId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_idx" ON "public"."SubscriptionPayment"("status");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_moduleKey_idx" ON "public"."SubscriptionPayment"("moduleKey");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_gatewayOrderId_idx" ON "public"."SubscriptionPayment"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_createdAt_idx" ON "public"."SubscriptionPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_invoiceNumber_key" ON "public"."SubscriptionInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_paymentId_key" ON "public"."SubscriptionInvoice"("paymentId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_instituteId_idx" ON "public"."SubscriptionInvoice"("instituteId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_invoiceNumber_idx" ON "public"."SubscriptionInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_invoiceDate_idx" ON "public"."SubscriptionInvoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_status_idx" ON "public"."SubscriptionInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookLog_eventId_key" ON "public"."PaymentWebhookLog"("eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_gatewayOrderId_idx" ON "public"."PaymentWebhookLog"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_gatewayPaymentId_idx" ON "public"."PaymentWebhookLog"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_processingStatus_idx" ON "public"."PaymentWebhookLog"("processingStatus");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_receivedAt_idx" ON "public"."PaymentWebhookLog"("receivedAt");

-- AddForeignKey
ALTER TABLE "public"."Subject" ADD CONSTRAINT "Subject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chapter" ADD CONSTRAINT "Chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Topic" ADD CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditTransaction" ADD CONSTRAINT "CreditTransaction_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RechargeRequest" ADD CONSTRAINT "RechargeRequest_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RazorpayTransaction" ADD CONSTRAINT "RazorpayTransaction_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_ownerInstituteId_fkey" FOREIGN KEY ("ownerInstituteId") REFERENCES "public"."Institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paper" ADD CONSTRAINT "Paper_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaperQuestion" ADD CONSTRAINT "PaperQuestion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "public"."Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaperQuestion" ADD CONSTRAINT "PaperQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CbtTest" ADD CONSTRAINT "CbtTest_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "public"."Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CbtSubmission" ADD CONSTRAINT "CbtSubmission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "public"."CbtTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionExamMapping" ADD CONSTRAINT "QuestionExamMapping_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionExamMapping" ADD CONSTRAINT "QuestionExamMapping_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "public"."Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_cbtTestId_fkey" FOREIGN KEY ("cbtTestId") REFERENCES "public"."CbtTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamResult" ADD CONSTRAINT "ExamResult_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamSubjectResult" ADD CONSTRAINT "ExamSubjectResult_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "public"."ExamResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExamChapterResult" ADD CONSTRAINT "ExamChapterResult_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "public"."ExamResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResultAccessToken" ADD CONSTRAINT "ResultAccessToken_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "public"."ExamResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "public"."ExamResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppUsageLedger" ADD CONSTRAINT "WhatsAppUsageLedger_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeWebsite" ADD CONSTRAINT "CollegeWebsite_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeCourse" ADD CONSTRAINT "CollegeCourse_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeFaculty" ADD CONSTRAINT "CollegeFaculty_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeFacility" ADD CONSTRAINT "CollegeFacility_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeAchievement" ADD CONSTRAINT "CollegeAchievement_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeTestimonial" ADD CONSTRAINT "CollegeTestimonial_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeGalleryItem" ADD CONSTRAINT "CollegeGalleryItem_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeEnquiry" ADD CONSTRAINT "CollegeEnquiry_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeJobPosting" ADD CONSTRAINT "CollegeJobPosting_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."CollegeWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeJobApplication" ADD CONSTRAINT "CollegeJobApplication_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "public"."CollegeJobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeSubscription" ADD CONSTRAINT "CollegeSubscription_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."CollegeSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."CollegeSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "public"."Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."SubscriptionPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

