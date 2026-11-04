const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../db');
const { ensureDemoCollegeExists } = require('../lib/demoCollegeSeed');

const router = express.Router();

const RESUMES_DIR = path.join(__dirname, '..', '..', 'uploads', 'resumes');
fs.mkdirSync(RESUMES_DIR, { recursive: true });

// Setup multer for resume uploads
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RESUMES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `resume-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only PDF or Word documents (.pdf, .doc, .docx) are accepted.'));
    }
    cb(null, true);
  },
});

/**
 * GET /api/public/colleges/:slug
 * Retrieve complete published public website bundle for a college
 */
router.get('/:slug', async (req, res) => {
  try {
    let { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'College slug is required.' });

    let cleanSlug = slug.toLowerCase().trim();
    if (cleanSlug === 'demo') cleanSlug = 'andhra-inspire-academy';

    let website = await prisma.collegeWebsite.findUnique({
      where: { slug: cleanSlug },
      include: {
        institute: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoFilename: true,
            phone: true,
            address: true,
            tagline: true,
          },
        },
        courses: {
          orderBy: { displayOrder: 'asc' },
        },
        faculties: {
          orderBy: { displayOrder: 'asc' },
        },
        facilities: {
          orderBy: { displayOrder: 'asc' },
        },
        achievements: {
          orderBy: { displayOrder: 'asc' },
        },
        testimonials: {
          orderBy: { displayOrder: 'asc' },
        },
        galleryItems: {
          orderBy: { displayOrder: 'asc' },
        },
        jobPostings: {
          where: { isActive: true },
          select: {
            id: true,
            jobTitle: true,
            department: true,
            employmentType: true,
            vacanciesCount: true,
            minExperienceYrs: true,
            requiredQualifications: true,
            jobDescription: true,
            location: true,
            applicationDeadline: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If website not found in DB, check if it is the demo site or an existing institute
    if (!website) {
      if (cleanSlug === 'andhra-inspire-academy') {
        await ensureDemoCollegeExists(prisma);
      } else {
        // Check if an institute exists with this slug
        const inst = await prisma.institute.findFirst({
          where: {
            OR: [
              { slug: cleanSlug },
              { slug: { contains: cleanSlug } },
            ],
          },
        });
        if (inst) {
          await prisma.collegeWebsite.upsert({
            where: { instituteId: inst.id },
            create: {
              instituteId: inst.id,
              slug: inst.slug,
              displayName: inst.name,
              mottoTagline: inst.tagline || 'Excellence in Education',
              contactPhone: inst.phone || '',
              campusAddress: inst.address || '',
              isPublished: true,
              status: 'ACTIVE',
              publishedAt: new Date(),
            },
            update: {
              isPublished: true,
              status: 'ACTIVE',
            },
          });
        }
      }

      // Re-query
      website = await prisma.collegeWebsite.findUnique({
        where: { slug: cleanSlug },
        include: {
          institute: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoFilename: true,
              phone: true,
              address: true,
              tagline: true,
            },
          },
          courses: { orderBy: { displayOrder: 'asc' } },
          faculties: { orderBy: { displayOrder: 'asc' } },
          facilities: { orderBy: { displayOrder: 'asc' } },
          achievements: { orderBy: { displayOrder: 'asc' } },
          testimonials: { orderBy: { displayOrder: 'asc' } },
          galleryItems: { orderBy: { displayOrder: 'asc' } },
          jobPostings: {
            where: { isActive: true },
            select: {
              id: true,
              jobTitle: true,
              department: true,
              employmentType: true,
              vacanciesCount: true,
              minExperienceYrs: true,
              requiredQualifications: true,
              jobDescription: true,
              location: true,
              applicationDeadline: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    if (!website) {
      return res.status(404).json({ error: 'College website not found.' });
    }

    if (!website.isPublished) {
      return res.status(403).json({
        error: 'This college website is currently in draft mode and has not been published yet.',
        isDraft: true,
      });
    }

    if (website.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'This college website is currently suspended. Please contact platform administration.',
        isSuspended: true,
      });
    }

    // Modular SaaS Check: Online Examinations Module
    let formattedExams = [];
    if (website.hasOnlineExamModule) {
      const openExams = await prisma.cbtTest.findMany({
        where: {
          paper: { instituteId: website.instituteId },
          isPublicWebsiteVisible: true,
        },
        select: {
          id: true,
          code: true,
          title: true,
          examName: true,
          durationMinutes: true,
          positiveMarks: true,
          negativeMarks: true,
          securityMode: true,
          publicDescription: true,
          createdAt: true,
          paper: {
            select: {
              title: true,
              examName: true,
              questions: { select: { id: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      formattedExams = openExams.map((test) => ({
        id: test.id,
        code: test.code,
        title: test.title,
        examName: test.examName || test.paper?.examName || 'Competitive Exam',
        questionCount: test.paper?.questions?.length || 0,
        durationMinutes: test.durationMinutes,
        positiveMarks: test.positiveMarks,
        negativeMarks: test.negativeMarks,
        publicDescription: test.publicDescription,
        cbtUrl: `/#/cbt/${test.code}`,
      }));
    }

    // Modular SaaS Check: Recruitment Module
    const activeJobPostings = website.hasRecruitmentModule ? (website.jobPostings || []) : [];

    // Helper safely parsing JSON
    const safeParse = (str, fallback) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    };

    res.json({
      website: {
        ...website,
        jobPostings: activeJobPostings,
        openExams: formattedExams,
        parsedStatsCounters: safeParse(website.statsCountersJson, []),
        parsedWhyChooseUs: safeParse(website.whyChooseUsJson, []),
        parsedMethodologySteps: safeParse(website.methodologyStepsJson, []),
        parsedAdmissionProcess: safeParse(website.admissionProcessJson, []),
        parsedScholarshipDetails: safeParse(website.scholarshipDetailsJson, []),
        parsedFaqs: safeParse(website.faqsJson, []),
      },
    });
  } catch (err) {
    console.error('Error serving public college website:', err);
    res.status(500).json({ error: 'Server error retrieving college website.' });
  }
});

/**
 * POST /api/public/colleges/:slug/enquiries
 * Prospective student/parent submits an admission enquiry
 */
router.post('/:slug/enquiries', async (req, res) => {
  try {
    let cleanSlug = (req.params.slug || '').toLowerCase().trim();
    if (cleanSlug === 'demo') cleanSlug = 'andhra-inspire-academy';
    const { studentName, parentName, phone, email, courseOfInterest, cityOrTown, academicYear, message } = req.body;

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ error: 'Student full name is required.' });
    }
    if (!phone || !phone.trim() || phone.trim().length < 10) {
      return res.status(400).json({ error: 'A valid 10-digit mobile number is required.' });
    }

    const website = await prisma.collegeWebsite.findUnique({
      where: { slug: cleanSlug },
      select: { id: true, isPublished: true, status: true, hasCrmModule: true },
    });

    if (!website || !website.isPublished || website.status === 'SUSPENDED') {
      return res.status(404).json({ error: 'College website is not active.' });
    }

    if (!website.hasCrmModule) {
      return res.status(403).json({ error: 'Admission enquiry system is currently not activated for this institution.' });
    }

    const enquiry = await prisma.collegeEnquiry.create({
      data: {
        websiteId: website.id,
        studentName: studentName.trim(),
        parentName: parentName?.trim() || null,
        phone: phone.trim(),
        email: email?.trim() || null,
        courseOfInterest: courseOfInterest?.trim() || null,
        cityOrTown: cityOrTown?.trim() || null,
        academicYear: academicYear?.trim() || null,
        message: message?.trim() || null,
        status: 'NEW',
      },
    });

    res.json({
      success: true,
      message: 'Thank you! Your enquiry has been received. Our admissions counselor will get in touch with you shortly.',
      enquiryId: enquiry.id,
    });
  } catch (err) {
    console.error('Error submitting enquiry:', err);
    res.status(500).json({ error: 'Failed to submit enquiry. Please try again later.' });
  }
});

/**
 * POST /api/public/colleges/:slug/careers/:jobId/apply
 * Faculty applicant applies for a career opening with resume
 */
router.post('/:slug/careers/:jobId/apply', (req, res) => {
  uploadResume.single('resume')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message });
    }

    try {
      let { slug, jobId } = req.params;
      let cleanSlug = (slug || '').toLowerCase().trim();
      if (cleanSlug === 'demo') cleanSlug = 'andhra-inspire-academy';
      const {
        applicantName, email, phone, currentLocation,
        experienceYrs, currentEmployer, expectedSalary, coverLetter
      } = req.body;

      if (!applicantName || !email || !phone) {
        return res.status(400).json({ error: 'Name, email, and phone number are required.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Please attach your resume (PDF or DOCX).' });
      }

      const jobPosting = await prisma.collegeJobPosting.findUnique({
        where: { id: jobId },
        include: { website: true },
      });

      if (!jobPosting || !jobPosting.isActive || jobPosting.website.slug !== cleanSlug || !jobPosting.website.hasRecruitmentModule) {
        return res.status(404).json({ error: 'Job opening is no longer accepting applications.' });
      }

      const application = await prisma.collegeJobApplication.create({
        data: {
          jobPostingId: jobId,
          applicantName: applicantName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          currentLocation: currentLocation?.trim() || null,
          experienceYrs: Number(experienceYrs) || 0,
          currentEmployer: currentEmployer?.trim() || null,
          expectedSalary: expectedSalary?.trim() || null,
          resumeFilename: req.file.filename,
          coverLetter: coverLetter?.trim() || null,
          status: 'SUBMITTED',
        },
      });

      res.json({
        success: true,
        message: 'Application submitted successfully! The institution will review your profile.',
        applicationId: application.id,
      });
    } catch (err) {
      console.error('Error processing job application:', err);
      res.status(500).json({ error: 'Failed to process application. Please try again.' });
    }
  });
});

module.exports = router;
