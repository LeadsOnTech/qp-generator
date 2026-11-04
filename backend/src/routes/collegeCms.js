const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

// Ensure directories exist
const IMAGES_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');
const BROCHURES_DIR = path.join(__dirname, '..', '..', 'uploads', 'brochures');
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(BROCHURES_DIR, { recursive: true });

// Setup multer for CMS uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'brochure' || file.mimetype === 'application/pdf') {
      cb(null, BROCHURES_DIR);
    } else {
      cb(null, IMAGES_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error(`File type ${ext} not allowed. Allowed: png, jpg, jpeg, webp, pdf`));
    }
    cb(null, true);
  },
});

/**
 * Helper to get the college's website or bootstrap an initial one
 */
async function getOrCreateWebsite(instituteId) {
  let website = await prisma.collegeWebsite.findUnique({
    where: { instituteId },
    include: {
      courses: { orderBy: { displayOrder: 'asc' } },
      faculties: { orderBy: { displayOrder: 'asc' } },
      facilities: { orderBy: { displayOrder: 'asc' } },
      achievements: { orderBy: { displayOrder: 'asc' } },
      testimonials: { orderBy: { displayOrder: 'asc' } },
      galleryItems: { orderBy: { displayOrder: 'asc' } },
      jobPostings: {
        include: {
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      enquiries: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!website) {
    const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
    if (!institute) throw new Error('Institute not found');

    website = await prisma.collegeWebsite.create({
      data: {
        instituteId,
        slug: institute.slug,
        displayName: institute.name,
        mottoTagline: institute.tagline || 'Excellence in Education',
        contactPhone: institute.phone || '',
        campusAddress: institute.address || '',
        aboutTitle: `About ${institute.name}`,
        aboutText: `${institute.name} is dedicated to fostering academic excellence, holistic character, and competitive leadership. Our students consistently excel in state and national examinations.`,
        statsCountersJson: JSON.stringify([
          { label: 'Successful Alumni', value: '10,000+' },
          { label: 'NEET/JEE Selections', value: '2,500+' },
          { label: 'Expert Faculty', value: '50+' },
          { label: 'State Ranks', value: '150+' },
        ]),
      },
      include: {
        courses: true,
        faculties: true,
        facilities: true,
        achievements: true,
        testimonials: true,
        galleryItems: true,
        jobPostings: { include: { _count: { select: { applications: true } } } },
        enquiries: true,
      },
    });
  }

  return website;
}

// ==========================================
// 1. WEBSITE OVERVIEW & CORE SETTINGS
// ==========================================

router.get('/website', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    if (!instituteId) {
      return res.status(403).json({ error: 'Only institute accounts have college websites.' });
    }
    const website = await getOrCreateWebsite(instituteId);
    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true, name: true, slug: true, logoFilename: true },
    });
    res.json({ website, institute });
  } catch (err) {
    console.error('Error fetching college website:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/website', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    if (!instituteId) return res.status(403).json({ error: 'Unauthorized.' });

    const allowed = [
      'themeTemplate', 'primaryColor', 'secondaryColor', 'accentColor', 'fontFamily',
      'heroTitle', 'heroSubtitle', 'heroBannerUrl', 'heroCtaText', 'heroCtaLink',
      'displayName', 'mottoTagline', 'estYear', 'accreditation', 'campusAddress',
      'contactPhone', 'contactEmail', 'whatsappNumber', 'googleMapEmbedUrl',
      'socialFacebook', 'socialInstagram', 'socialYoutube', 'socialLinkedin', 'socialTwitter',
      'aboutTitle', 'aboutText', 'visionText', 'missionText', 'statsCountersJson',
      'directorName', 'directorTitle', 'directorPhotoUrl', 'directorMessage', 'directorQualifications',
      'metaTitle', 'metaDescription', 'metaKeywords', 'ogImageUrl',
    ];

    const data = {};
    for (const key of allowed) {
      if (key in req.body) {
        if (key === 'estYear') {
          data[key] = req.body[key] ? parseInt(req.body[key], 10) : null;
        } else {
          data[key] = req.body[key];
        }
      }
    }

    const website = await prisma.collegeWebsite.update({
      where: { instituteId },
      data,
    });

    res.json({ ok: true, website });
  } catch (err) {
    console.error('Error updating college website:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    if (!instituteId) return res.status(403).json({ error: 'Unauthorized.' });

    const website = await prisma.collegeWebsite.update({
      where: { instituteId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedVersion: { increment: 1 },
      },
    });

    res.json({ ok: true, website, message: 'Website successfully published!' });
  } catch (err) {
    console.error('Error publishing website:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/unpublish', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    if (!instituteId) return res.status(403).json({ error: 'Unauthorized.' });

    const website = await prisma.collegeWebsite.update({
      where: { instituteId },
      data: { isPublished: false },
    });

    res.json({ ok: true, website, message: 'Website has been unpublished.' });
  } catch (err) {
    console.error('Error unpublishing website:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. COURSES MANAGEMENT
// ==========================================

router.post('/courses', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const {
      courseName, category = 'FOUNDATION', targetExam, duration,
      eligibility, description, syllabusOverview, highlightsJson,
      brochureFilename, isFeatured = false, displayOrder = 0
    } = req.body;

    if (!courseName) return res.status(400).json({ error: 'Course name is required.' });

    const slug = courseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const course = await prisma.collegeCourse.create({
      data: {
        websiteId: website.id,
        courseName,
        slug,
        category,
        targetExam,
        duration,
        eligibility,
        description,
        syllabusOverview,
        highlightsJson,
        brochureFilename,
        isFeatured: Boolean(isFeatured),
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.json({ ok: true, course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/courses/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    const existing = await prisma.collegeCourse.findFirst({
      where: { id, websiteId: website.id },
    });
    if (!existing) return res.status(404).json({ error: 'Course not found.' });

    const fields = [
      'courseName', 'category', 'targetExam', 'duration', 'eligibility',
      'description', 'syllabusOverview', 'highlightsJson', 'brochureFilename',
      'isFeatured', 'displayOrder',
    ];
    const data = {};
    for (const f of fields) {
      if (f in req.body) {
        if (f === 'isFeatured') data[f] = Boolean(req.body[f]);
        else if (f === 'displayOrder') data[f] = Number(req.body[f]) || 0;
        else data[f] = req.body[f];
      }
    }

    if (data.courseName) {
      data.slug = data.courseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const updated = await prisma.collegeCourse.update({
      where: { id },
      data,
    });

    res.json({ ok: true, course: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeCourse.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. FACULTY MANAGEMENT
// ==========================================

router.post('/faculty', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { name, designation, department, qualification, experienceYrs, photoUrl, bio, displayOrder = 0 } = req.body;

    if (!name || !designation || !department) {
      return res.status(400).json({ error: 'Name, designation, and department are required.' });
    }

    const faculty = await prisma.collegeFaculty.create({
      data: {
        websiteId: website.id,
        name,
        designation,
        department,
        qualification: qualification || '',
        experienceYrs: experienceYrs ? parseInt(experienceYrs, 10) : null,
        photoUrl,
        bio,
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.json({ ok: true, faculty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/faculty/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    const fields = ['name', 'designation', 'department', 'qualification', 'experienceYrs', 'photoUrl', 'bio', 'displayOrder'];
    const data = {};
    for (const f of fields) {
      if (f in req.body) {
        if (f === 'experienceYrs') data[f] = req.body[f] ? parseInt(req.body[f], 10) : null;
        else if (f === 'displayOrder') data[f] = Number(req.body[f]) || 0;
        else data[f] = req.body[f];
      }
    }

    const updated = await prisma.collegeFaculty.update({
      where: { id },
      data,
    });

    res.json({ ok: true, faculty: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/faculty/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeFaculty.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. INFRASTRUCTURE & FACILITIES
// ==========================================

router.post('/facilities', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { title, category = 'LAB', description, photoUrl, displayOrder = 0 } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const facility = await prisma.collegeFacility.create({
      data: {
        websiteId: website.id,
        title,
        category,
        description,
        photoUrl,
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.json({ ok: true, facility });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/facilities/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    const fields = ['title', 'category', 'description', 'photoUrl', 'displayOrder'];
    const data = {};
    for (const f of fields) {
      if (f in req.body) {
        if (f === 'displayOrder') data[f] = Number(req.body[f]) || 0;
        else data[f] = req.body[f];
      }
    }

    const updated = await prisma.collegeFacility.update({
      where: { id },
      data,
    });

    res.json({ ok: true, facility: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/facilities/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeFacility.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. ACHIEVEMENTS & HALL OF FAME
// ==========================================

router.post('/achievements', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { studentName, examOrAward, rankOrScore, year = 2025, category = 'COMPETITIVE_EXAM', description, photoUrl, displayOrder = 0 } = req.body;

    if (!examOrAward) return res.status(400).json({ error: 'Exam or Award name is required.' });

    const achievement = await prisma.collegeAchievement.create({
      data: {
        websiteId: website.id,
        studentName,
        examOrAward,
        rankOrScore,
        year: Number(year) || 2025,
        category,
        description,
        photoUrl,
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.json({ ok: true, achievement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/achievements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['studentName', 'examOrAward', 'rankOrScore', 'year', 'category', 'description', 'photoUrl', 'displayOrder'];
    const data = {};
    for (const f of fields) {
      if (f in req.body) {
        if (f === 'year' || f === 'displayOrder') data[f] = Number(req.body[f]) || 0;
        else data[f] = req.body[f];
      }
    }

    const updated = await prisma.collegeAchievement.update({
      where: { id },
      data,
    });

    res.json({ ok: true, achievement: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/achievements/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeAchievement.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. TESTIMONIALS
// ==========================================

router.post('/testimonials', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { authorName, authorRole, quote, rating = 5, avatarUrl, displayOrder = 0 } = req.body;

    if (!authorName || !quote) return res.status(400).json({ error: 'Author name and quote are required.' });

    const testimonial = await prisma.collegeTestimonial.create({
      data: {
        websiteId: website.id,
        authorName,
        authorRole: authorRole || 'Student',
        quote,
        rating: Number(rating) || 5,
        avatarUrl,
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.json({ ok: true, testimonial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/testimonials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['authorName', 'authorRole', 'quote', 'rating', 'avatarUrl', 'displayOrder'];
    const data = {};
    for (const f of fields) {
      if (f in req.body) {
        if (f === 'rating' || f === 'displayOrder') data[f] = Number(req.body[f]) || 0;
        else data[f] = req.body[f];
      }
    }

    const updated = await prisma.collegeTestimonial.update({
      where: { id },
      data,
    });

    res.json({ ok: true, testimonial: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/testimonials/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeTestimonial.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. PHOTO & MEDIA GALLERY
// ==========================================

router.post('/gallery', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { title, category = 'CAMPUS', mediaUrl, mediaType = 'IMAGE', displayOrder = 0 } = req.body;

    if (!mediaUrl) return res.status(400).json({ error: 'Media URL is required.' });

    const item = await prisma.collegeGalleryItem.create({
      data: {
        websiteId: website.id,
        title,
        category,
        mediaUrl,
        mediaType,
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/gallery/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['title', 'category', 'mediaUrl', 'mediaType', 'displayOrder'];
    const data = {};
    for (const f of fields) {
      if (f in req.body) {
        if (f === 'displayOrder') data[f] = Number(req.body[f]) || 0;
        else data[f] = req.body[f];
      }
    }

    const updated = await prisma.collegeGalleryItem.update({
      where: { id },
      data,
    });

    res.json({ ok: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/gallery/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeGalleryItem.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. ADMISSION ENQUIRIES / LEADS INBOX
// ==========================================

router.get('/enquiries', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);

    const enquiries = await prisma.collegeEnquiry.findMany({
      where: { websiteId: website.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ enquiries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const data = {};
    if (status) data.status = status;
    if ('adminNotes' in req.body) data.adminNotes = adminNotes;

    const updated = await prisma.collegeEnquiry.update({
      where: { id },
      data,
    });

    res.json({ ok: true, enquiry: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/enquiries/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeEnquiry.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. FACULTY CAREERS & APPLICATIONS
// ==========================================

router.get('/jobs', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);

    const jobs = await prisma.collegeJobPosting.findMany({
      where: { websiteId: website.id },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const {
      jobTitle, department, employmentType = 'FULL_TIME',
      vacanciesCount = 1, minExperienceYrs = 2,
      requiredQualifications, jobDescription, location,
      applicationDeadline, isActive = true
    } = req.body;

    if (!jobTitle || !department || !jobDescription) {
      return res.status(400).json({ error: 'Job title, department, and description are required.' });
    }

    const job = await prisma.collegeJobPosting.create({
      data: {
        websiteId: website.id,
        jobTitle,
        department,
        employmentType,
        vacanciesCount: Number(vacanciesCount) || 1,
        minExperienceYrs: Number(minExperienceYrs) || 0,
        requiredQualifications: requiredQualifications || '',
        jobDescription,
        location,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        isActive: Boolean(isActive),
      },
    });

    res.json({ ok: true, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [
      'jobTitle', 'department', 'employmentType', 'vacanciesCount',
      'minExperienceYrs', 'requiredQualifications', 'jobDescription',
      'location', 'applicationDeadline', 'isActive'
    ];
    const data = {};
    for (const f of fields) {
      if (f in req.body) {
        if (f === 'vacanciesCount' || f === 'minExperienceYrs') data[f] = Number(req.body[f]) || 0;
        else if (f === 'isActive') data[f] = Boolean(req.body[f]);
        else if (f === 'applicationDeadline') data[f] = req.body[f] ? new Date(req.body[f]) : null;
        else data[f] = req.body[f];
      }
    }

    const updated = await prisma.collegeJobPosting.update({
      where: { id },
      data,
    });

    res.json({ ok: true, job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);
    const { id } = req.params;

    await prisma.collegeJobPosting.deleteMany({
      where: { id, websiteId: website.id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs/:jobId/applications', async (req, res) => {
  try {
    const { jobId } = req.params;
    const applications = await prisma.collegeJobApplication.findMany({
      where: { jobPostingId: jobId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/applications', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    const website = await getOrCreateWebsite(instituteId);

    const applications = await prisma.collegeJobApplication.findMany({
      where: {
        jobPosting: { websiteId: website.id },
      },
      include: {
        jobPosting: { select: { id: true, jobTitle: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, internalNotes } = req.body;

    const data = {};
    if (status) data.status = status;
    if ('internalNotes' in req.body) data.internalNotes = internalNotes;

    const updated = await prisma.collegeJobApplication.update({
      where: { id },
      data,
    });

    res.json({ ok: true, application: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. OPEN EXAMINATIONS (CBT LINKAGE)
// ==========================================

router.get('/exams', async (req, res) => {
  try {
    const instituteId = req.user.instituteId;
    // Find all CBT tests owned by this institute
    const cbtTests = await prisma.cbtTest.findMany({
      where: {
        paper: { instituteId },
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            examName: true,
            questions: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = cbtTests.map(t => ({
      id: t.id,
      code: t.code,
      title: t.title,
      examName: t.examName,
      durationMinutes: t.durationMinutes,
      securityMode: t.securityMode,
      positiveMarks: t.positiveMarks,
      negativeMarks: t.negativeMarks,
      isPublicWebsiteVisible: t.isPublicWebsiteVisible,
      publicDescription: t.publicDescription,
      questionCount: t.paper?.questions?.length || 0,
      paperTitle: t.paper?.title,
      cbtUrl: `/#/cbt/${t.code}`,
    }));

    res.json({ exams: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublicWebsiteVisible, publicDescription } = req.body;

    const data = {};
    if ('isPublicWebsiteVisible' in req.body) data.isPublicWebsiteVisible = Boolean(isPublicWebsiteVisible);
    if ('publicDescription' in req.body) data.publicDescription = publicDescription;

    const updated = await prisma.cbtTest.update({
      where: { id },
      data,
    });

    res.json({ ok: true, exam: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. MEDIA UPLOAD
// ==========================================

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const isPdf = req.file.mimetype === 'application/pdf';
  const folder = isPdf ? 'brochures' : 'images';
  const url = `/uploads/${folder}/${req.file.filename}`;

  res.json({
    ok: true,
    filename: req.file.filename,
    url,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

module.exports = router;
