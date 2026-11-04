/**
 * Helper to ensure the Showcase Demo College Website exists in the database
 */
async function ensureDemoCollegeExists(prisma) {
  try {
    let institute = await prisma.institute.findFirst({
      where: {
        OR: [
          { slug: 'andhra-inspire-academy' },
          { name: 'Andhra Inspire Academy' },
        ],
      },
    });

    if (!institute) {
      institute = await prisma.institute.create({
        data: {
          name: 'Andhra Inspire Academy',
          slug: 'andhra-inspire-academy',
          phone: '+91 98480 12345',
          address: 'Plot 42, Benz Circle, MG Road, Vijayawada, Andhra Pradesh - 520010',
          tagline: 'Shaping State Toppers & National Rankers in NEET, JEE & EAPCET',
        },
      });
    }

    const website = await prisma.collegeWebsite.upsert({
      where: { instituteId: institute.id },
      create: {
        instituteId: institute.id,
        slug: 'andhra-inspire-academy',
        displayName: 'Andhra Inspire Academy of Science & Technology',
        mottoTagline: 'Shaping State Toppers & National Rankers in NEET, JEE & EAPCET',
        accreditation: 'BIEAP Recognized & CBSE Affiliated Senior Secondary',
        estYear: 2012,
        primaryColor: '#1e3a8a',
        secondaryColor: '#0f766e',
        accentColor: '#f59e0b',
        fontFamily: 'Inter',
        heroTitle: 'Empowering Future Doctors & Engineers with Elite Mentorship',
        heroSubtitle: 'Andhra Pradesh’s Premier Residential Academy for NEET-UG, JEE Advanced & Intermediate Excellence with 14+ Years of Proven Ranks.',
        heroBannerUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
        heroCtaText: 'Apply for Admission 2026-27',
        heroCtaLink: '#admissions',
        campusAddress: 'Plot 42, Benz Circle, MG Road, Vijayawada, Andhra Pradesh - 520010',
        contactPhone: '+91 98480 12345',
        contactEmail: 'admissions@andhrainspire.edu.in',
        whatsappNumber: '919848012345',
        googleMapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3825.438902517596!2d80.6480155!3d16.5042858!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a35fab53051d953%3A0x64e83f0f701d0bc8!2sBenz%20Circle%2C%20Vijayawada%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
        aboutTitle: '14+ Years of Academic Integrity & Unmatched Results',
        aboutText: 'Founded in 2012 with a visionary commitment to scientific rigor and human empathy, Andhra Inspire Academy has emerged as a beacon of excellence in competitive coaching across Andhra Pradesh and Telangana. We blend disciplined academic pedagogy with modern interactive technologies, individual diagnostic tracking, and continuous parental counseling.',
        visionText: 'To be the most trusted educational ecosystem that transforms students into doctors, engineers, and researchers of the highest intellectual and ethical caliber.',
        missionText: 'Deliver conceptual depth over rote memorization, provide error diagnostics after every test, maintain teacher-student mentorship ratios of 1:25, and cultivate high psychological resilience.',
        statsCountersJson: JSON.stringify([
          { label: 'Students Mentored', value: '18,500+' },
          { label: 'NEET & JEE Selections', value: '3,840+' },
          { label: 'State Top 10 Ranks', value: '62' },
          { label: 'Olympiad & KVPY Scholars', value: '140+' },
        ]),
        promotionalBannerText: '🔥 Admissions Open for Academic Year 2026-27 | Annual Scholarship & Diagnostic Talent Test (AITSE) this Sunday | Up to 100% Fee Concessions | Call: +91 98480 12345',
        hasOnlineExamModule: true,
        hasRecruitmentModule: true,
        hasCrmModule: true,
        hasAdvertisingModule: false,
        showStatsSection: true,
        showAboutSection: true,
        showDirectorSection: true,
        showWhyUsSection: true,
        showCoursesSection: true,
        showFacultySection: true,
        showMethodologySection: true,
        showFacilitiesSection: true,
        showResultsSection: true,
        showAdmissionsSection: true,
        showOpenExamsSection: true,
        showCareersSection: true,
        showGallerySection: true,
        showTestimonialsSection: true,
        showFaqSection: true,
        showContactFormSection: true,
        whyChooseUsJson: JSON.stringify([
          {
            icon: 'academic-cap',
            title: 'IITian & Doctor Faculty Pool',
            description: 'Learn directly from seasoned master teachers with 15+ years of track record producing Top 100 AIRs in NEET & JEE Advanced.'
          },
          {
            icon: 'document-text',
            title: 'Daily Practice Problem (DPP) Sheets',
            description: 'Every lecture is reinforced with graded homework problem sheets (Level 1 Foundation, Level 2 Standard, Level 3 Challenger).'
          },
          {
            icon: 'desktop-computer',
            title: 'NTA-Pattern Computer CBT Labs',
            description: 'State-of-the-art testing center simulating real-time examination pressure, countdown timers, and negative marks.'
          },
          {
            icon: 'chat-alt-2',
            title: '1-on-1 Daily Doubt Clinics',
            description: 'Dedicated post-class doubt resolution from 4 PM to 7 PM every evening where students resolve every bottleneck.'
          },
          {
            icon: 'device-mobile',
            title: 'Parent WhatsApp Pulse Reports',
            description: 'Automated weekly progress reports, subject-wise weakness diagnostics, and attendance notifications sent directly to parents.'
          },
          {
            icon: 'shield-check',
            title: 'Residential Campus with Strict Discipline',
            description: '24/7 guarded, hygienic air-conditioned hostels, cell-phone-free study environments, and resident mentor guidance.'
          }
        ]),
        methodologyStepsJson: JSON.stringify([
          {
            stepNumber: '01',
            badge: 'FOUNDATION',
            title: 'First-Principles Concept Mastery',
            description: 'Deep theoretical grounding without rote memorization. Visual simulations and interactive problem derivations by senior faculty.'
          },
          {
            stepNumber: '02',
            badge: 'APPLICATION',
            title: 'Daily Graded Worksheets (DPPs)',
            description: 'Immediate reinforcement of concepts through timed practice sets covering single-choice, numerical, and assertion-reason questions.'
          },
          {
            stepNumber: '03',
            badge: 'BENCHMARKING',
            title: 'Weekly OMR & Computerized CBT Tests',
            description: 'Strict Sunday grand tests benchmarked on national NEET/JEE difficulty scales to build speed, accuracy, and test stamina.'
          },
          {
            stepNumber: '04',
            badge: 'REMEDIATION',
            title: 'Diagnostic Error & Gap Analysis',
            description: 'QuestionsStudio AI-powered error diagnostics pinpoint whether mistakes were calculation errors, conceptual gaps, or panic skips.'
          },
          {
            stepNumber: '05',
            badge: 'MENTORSHIP',
            title: 'Personalized 1-on-1 Faculty Mentorship',
            description: 'Individual counseling sessions to eliminate negative marking, refine time allocation strategies, and maintain peak mental morale.'
          }
        ]),
        admissionProcessJson: JSON.stringify([
          {
            step: '01',
            title: 'Online Enquiry & Registration',
            description: 'Fill out our online admission enquiry form or visit our campus reception with student academic credentials.'
          },
          {
            step: '02',
            title: 'Diagnostic Aptitude & Scholarship Test',
            description: 'Appear for the Andhra Inspire Talent Search Exam (AITSE) to assess conceptual readiness and earn scholarship waivers.'
          },
          {
            step: '03',
            title: 'Academic Counseling & Batch Selection',
            description: 'One-on-one session with senior academic directors to finalize target goals (NEET Medical, IIT Engineering, or Foundation).'
          },
          {
            step: '04',
            title: 'Enrollment & Academic Onboarding',
            description: 'Finalize document verification, study material kit distribution, hostel room allotment, and attend the student induction ceremony.'
          }
        ]),
        scholarshipDetailsJson: JSON.stringify([
          {
            name: 'State Ranker Scholarship',
            criteria: 'Top 50 Ranks in AITSE or 98%+ in Class 10 Board Exams',
            benefit: '100% Full Tuition Waiver for 2 Years'
          },
          {
            name: 'Merit Excellence Scholarship',
            criteria: 'Ranks 51 - 150 in AITSE or 95% - 97.9% in 10th Board Exams',
            benefit: '75% Tuition Fee Waiver'
          },
          {
            name: 'Academic Achiever Concession',
            criteria: 'Ranks 151 - 500 in AITSE or 90% - 94.9% in 10th Board Exams',
            benefit: '50% Tuition Fee Waiver'
          },
          {
            name: 'Special Social & Defense Quota',
            criteria: 'Wards of Armed Forces / Police & Single Parent Girl Students',
            benefit: 'Special 25% Institutional Grant'
          }
        ]),
        faqsJson: JSON.stringify([
          {
            category: 'Academics',
            question: 'What curriculum and examination boards are affiliated with the academy?',
            answer: 'We provide integrated senior secondary education recognized by the Board of Intermediate Education, Andhra Pradesh (BIEAP) as well as CBSE-aligned competitive foundation. Concurrently, students are rigorously prepared for NEET-UG, IIT-JEE Main & Advanced, and AP/TS EAPCET.'
          },
          {
            category: 'Doubt Clearance',
            question: 'How are doubt clearance and revision handled for students needing individual support?',
            answer: 'Every day from 4:00 PM to 7:00 PM is reserved for mandatory 1-on-1 doubt clinics. Dedicated subject teachers sit with students individually to dissect homework errors and explain tough concepts until complete mastery is attained.'
          },
          {
            category: 'Hostel & Discipline',
            question: 'What is the mobile phone and device policy for residential students?',
            answer: 'Our residential campuses are strictly smartphone-free environments to eliminate digital distractions and foster deep focus. Supervised computer terminals are provided for CBT test practice. Parents can communicate via dedicated warden contact hours.'
          },
          {
            category: 'Testing & Evaluation',
            question: 'How frequently are exams conducted and how do parents track student progress?',
            answer: 'Every weekend features an OMR or Computer-Based Test (CBT). Results, state percentiles, subject breakdowns, and negative marking analysis are delivered directly to parent mobile numbers via WhatsApp and SMS within 24 hours.'
          },
          {
            category: 'Scholarships',
            question: 'Can students take the Scholarship & Entrance Test online?',
            answer: 'Yes! External students can register through the Open Examinations section on this website and attempt the online screening test from home or walk into our campus CBT testing center.'
          },
          {
            category: 'Careers',
            question: 'How can experienced teachers apply for faculty or academic leadership roles?',
            answer: 'Passionate educators can apply directly through the Faculty Careers section of this website. Our academic dean reviews applications, followed by a written subject assessment and live classroom teaching demonstration.'
          }
        ]),
        directorName: 'Dr. K. S. R. Murthy',
        directorTitle: 'Founder, Chairman & Academic Director',
        directorPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
        directorQualifications: 'Ph.D in Physics (IIT Madras), 28+ Years of Mentoring National Rankers',
        directorMessage: 'Success in competitive examinations like NEET and JEE is never an accident. It is the natural consequence of daily conceptual clarity, targeted practice, and fearless self-correction. At Andhra Inspire Academy, every student is known personally, guided patiently, and challenged systematically to realize their supreme potential.',
        metaTitle: 'Andhra Inspire Academy | Best NEET & JEE Coaching in Vijayawada',
        metaDescription: 'Top-ranked junior college and coaching academy in Vijayawada for NEET-UG, IIT-JEE Main/Advanced, and EAPCET with proven state toppers and air-conditioned residential campuses.',
        isPublished: true,
        status: 'ACTIVE',
        publishedAt: new Date(),
        publishedVersion: 1,
      },
      update: {
        isPublished: true,
        status: 'ACTIVE',
        publishedAt: new Date(),
        promotionalBannerText: '🔥 Admissions Open for Academic Year 2026-27 | Annual Scholarship & Diagnostic Talent Test (AITSE) this Sunday | Up to 100% Fee Concessions | Call: +91 98480 12345',
        hasOnlineExamModule: true,
        hasRecruitmentModule: true,
        hasCrmModule: true,
        hasAdvertisingModule: false,
        showStatsSection: true,
        showAboutSection: true,
        showDirectorSection: true,
        showWhyUsSection: true,
        showCoursesSection: true,
        showFacultySection: true,
        showMethodologySection: true,
        showFacilitiesSection: true,
        showResultsSection: true,
        showAdmissionsSection: true,
        showOpenExamsSection: true,
        showCareersSection: true,
        showGallerySection: true,
        showTestimonialsSection: true,
        showFaqSection: true,
        showContactFormSection: true,
        whyChooseUsJson: JSON.stringify([
          {
            icon: 'academic-cap',
            title: 'IITian & Doctor Faculty Pool',
            description: 'Learn directly from seasoned master teachers with 15+ years of track record producing Top 100 AIRs in NEET & JEE Advanced.'
          },
          {
            icon: 'document-text',
            title: 'Daily Practice Problem (DPP) Sheets',
            description: 'Every lecture is reinforced with graded homework problem sheets (Level 1 Foundation, Level 2 Standard, Level 3 Challenger).'
          },
          {
            icon: 'desktop-computer',
            title: 'NTA-Pattern Computer CBT Labs',
            description: 'State-of-the-art testing center simulating real-time examination pressure, countdown timers, and negative marks.'
          },
          {
            icon: 'chat-alt-2',
            title: '1-on-1 Daily Doubt Clinics',
            description: 'Dedicated post-class doubt resolution from 4 PM to 7 PM every evening where students resolve every bottleneck.'
          },
          {
            icon: 'device-mobile',
            title: 'Parent WhatsApp Pulse Reports',
            description: 'Automated weekly progress reports, subject-wise weakness diagnostics, and attendance notifications sent directly to parents.'
          },
          {
            icon: 'shield-check',
            title: 'Residential Campus with Strict Discipline',
            description: '24/7 guarded, hygienic air-conditioned hostels, cell-phone-free study environments, and resident mentor guidance.'
          }
        ]),
        methodologyStepsJson: JSON.stringify([
          {
            stepNumber: '01',
            badge: 'FOUNDATION',
            title: 'First-Principles Concept Mastery',
            description: 'Deep theoretical grounding without rote memorization. Visual simulations and interactive problem derivations by senior faculty.'
          },
          {
            stepNumber: '02',
            badge: 'APPLICATION',
            title: 'Daily Graded Worksheets (DPPs)',
            description: 'Immediate reinforcement of concepts through timed practice sets covering single-choice, numerical, and assertion-reason questions.'
          },
          {
            stepNumber: '03',
            badge: 'BENCHMARKING',
            title: 'Weekly OMR & Computerized CBT Tests',
            description: 'Strict Sunday grand tests benchmarked on national NEET/JEE difficulty scales to build speed, accuracy, and test stamina.'
          },
          {
            stepNumber: '04',
            badge: 'REMEDIATION',
            title: 'Diagnostic Error & Gap Analysis',
            description: 'QuestionsStudio AI-powered error diagnostics pinpoint whether mistakes were calculation errors, conceptual gaps, or panic skips.'
          },
          {
            stepNumber: '05',
            badge: 'MENTORSHIP',
            title: 'Personalized 1-on-1 Faculty Mentorship',
            description: 'Individual counseling sessions to eliminate negative marking, refine time allocation strategies, and maintain peak mental morale.'
          }
        ]),
        admissionProcessJson: JSON.stringify([
          {
            step: '01',
            title: 'Online Enquiry & Registration',
            description: 'Fill out our online admission enquiry form or visit our campus reception with student academic credentials.'
          },
          {
            step: '02',
            title: 'Diagnostic Aptitude & Scholarship Test',
            description: 'Appear for the Andhra Inspire Talent Search Exam (AITSE) to assess conceptual readiness and earn scholarship waivers.'
          },
          {
            step: '03',
            title: 'Academic Counseling & Batch Selection',
            description: 'One-on-one session with senior academic directors to finalize target goals (NEET Medical, IIT Engineering, or Foundation).'
          },
          {
            step: '04',
            title: 'Enrollment & Academic Onboarding',
            description: 'Finalize document verification, study material kit distribution, hostel room allotment, and attend the student induction ceremony.'
          }
        ]),
        scholarshipDetailsJson: JSON.stringify([
          {
            name: 'State Ranker Scholarship',
            criteria: 'Top 50 Ranks in AITSE or 98%+ in Class 10 Board Exams',
            benefit: '100% Full Tuition Waiver for 2 Years'
          },
          {
            name: 'Merit Excellence Scholarship',
            criteria: 'Ranks 51 - 150 in AITSE or 95% - 97.9% in 10th Board Exams',
            benefit: '75% Tuition Fee Waiver'
          },
          {
            name: 'Academic Achiever Concession',
            criteria: 'Ranks 151 - 500 in AITSE or 90% - 94.9% in 10th Board Exams',
            benefit: '50% Tuition Fee Waiver'
          },
          {
            name: 'Special Social & Defense Quota',
            criteria: 'Wards of Armed Forces / Police & Single Parent Girl Students',
            benefit: 'Special 25% Institutional Grant'
          }
        ]),
        faqsJson: JSON.stringify([
          {
            category: 'Academics',
            question: 'What curriculum and examination boards are affiliated with the academy?',
            answer: 'We provide integrated senior secondary education recognized by the Board of Intermediate Education, Andhra Pradesh (BIEAP) as well as CBSE-aligned competitive foundation. Concurrently, students are rigorously prepared for NEET-UG, IIT-JEE Main & Advanced, and AP/TS EAPCET.'
          },
          {
            category: 'Doubt Clearance',
            question: 'How are doubt clearance and revision handled for students needing individual support?',
            answer: 'Every day from 4:00 PM to 7:00 PM is reserved for mandatory 1-on-1 doubt clinics. Dedicated subject teachers sit with students individually to dissect homework errors and explain tough concepts until complete mastery is attained.'
          },
          {
            category: 'Hostel & Discipline',
            question: 'What is the mobile phone and device policy for residential students?',
            answer: 'Our residential campuses are strictly smartphone-free environments to eliminate digital distractions and foster deep focus. Supervised computer terminals are provided for CBT test practice. Parents can communicate via dedicated warden contact hours.'
          },
          {
            category: 'Testing & Evaluation',
            question: 'How frequently are exams conducted and how do parents track student progress?',
            answer: 'Every weekend features an OMR or Computer-Based Test (CBT). Results, state percentiles, subject breakdowns, and negative marking analysis are delivered directly to parent mobile numbers via WhatsApp and SMS within 24 hours.'
          },
          {
            category: 'Scholarships',
            question: 'Can students take the Scholarship & Entrance Test online?',
            answer: 'Yes! External students can register through the Open Examinations section on this website and attempt the online screening test from home or walk into our campus CBT testing center.'
          },
          {
            category: 'Careers',
            question: 'How can experienced teachers apply for faculty or academic leadership roles?',
            answer: 'Passionate educators can apply directly through the Faculty Careers section of this website. Our academic dean reviews applications, followed by a written subject assessment and live classroom teaching demonstration.'
          }
        ]),
      },
    });

    // Check if courses already exist, if not create them
    const courseCount = await prisma.collegeCourse.count({ where: { websiteId: website.id } });
    if (courseCount === 0) {
      await prisma.collegeCourse.createMany({
        data: [
          {
            websiteId: website.id,
            courseName: 'NEET 2-Year Intensive Medical Batch (Classes 11 & 12)',
            slug: 'neet-2-year-intensive',
            category: 'MEDICAL',
            targetExam: 'NEET-UG & AIIMS',
            duration: '2 Academic Years',
            eligibility: 'Class 10 with 65%+ in Science & Mathematics',
            description: 'Comprehensive preparation for NEET-UG integrating Board syllabus with advanced problem-solving. Includes daily practice worksheets (DPPs), error analysis, and 45+ grand tests.',
            isFeatured: true,
            displayOrder: 1,
          },
          {
            websiteId: website.id,
            courseName: 'IIT-JEE Main & Advanced Elite Batch',
            slug: 'jee-main-advanced-elite',
            category: 'ENGINEERING',
            targetExam: 'JEE Main, JEE Advanced & BITSAT',
            duration: '2 Academic Years',
            eligibility: 'Class 10 with strong mathematical aptitude',
            description: 'High-rigor coaching emphasizing analytical derivation, multi-concept physics problems, organic mechanisms, and advanced calculus. Dedicated small mentoring batches.',
            isFeatured: true,
            displayOrder: 2,
          },
          {
            websiteId: website.id,
            courseName: '4-Year IIT/NEET Foundation Program (Classes 8, 9 & 10)',
            slug: 'foundation-olympiad-program',
            category: 'FOUNDATION',
            targetExam: 'NSEJS, Olympiads, NTSE & Early Foundation',
            duration: '1 to 3 Years',
            eligibility: 'Class 7/8/9 passed students',
            description: 'Builds unshakeable conceptual foundations in Physics, Chemistry, and Mathematics from high school. Fosters scientific curiosity and competitive exam readiness.',
            isFeatured: true,
            displayOrder: 3,
          },
          {
            websiteId: website.id,
            courseName: 'NEET Long-Term Achievers Batch (Repeater / Dropper)',
            slug: 'neet-long-term-repeaters',
            category: 'MEDICAL',
            targetExam: 'NEET-UG 2026',
            duration: '1 Full Year (Intensive)',
            eligibility: 'Intermediate / 12th passed students aiming for 680+ score',
            description: 'Complete revision of NCERT line-by-line with 120+ timed mock exams, negative marks elimination coaching, and personalized faculty mentoring.',
            isFeatured: true,
            displayOrder: 4,
          },
        ],
      });
    }

    const facultyCount = await prisma.collegeFaculty.count({ where: { websiteId: website.id } });
    if (facultyCount === 0) {
      await prisma.collegeFaculty.createMany({
        data: [
          {
            websiteId: website.id,
            name: 'Prof. Venkat Raman',
            designation: 'Senior HOD & Master Lecturer in Physics',
            department: 'Physics',
            qualification: 'M.Sc. Physics (IIT Madras)',
            experienceYrs: 20,
            photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
            bio: 'Specialist in Mechanics, Electrodynamics & Modern Physics. Mentored over 1,200 students into top 1000 AIR ranks.',
            displayOrder: 1,
          },
          {
            websiteId: website.id,
            name: 'Dr. Ananya Ray',
            designation: 'HOD & Senior Faculty in Chemistry',
            department: 'Chemistry',
            qualification: 'Ph.D in Organic Chemistry (IISc Bangalore)',
            experienceYrs: 16,
            photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
            bio: 'Expert in reaction mechanisms and physical chemistry thermodynamics with a passion for simplified visual explanations.',
            displayOrder: 2,
          },
          {
            websiteId: website.id,
            name: 'Prof. K. Sambasiva Rao',
            designation: 'Senior Master Faculty in Botany',
            department: 'Biology',
            qualification: 'M.Sc., M.Phil in Plant Physiology',
            experienceYrs: 22,
            photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
            bio: 'Author of widely circulated NEET Botany guides. Renowned for helping students achieve 350+/360 in NEET Biology.',
            displayOrder: 3,
          },
          {
            websiteId: website.id,
            name: 'Prof. S. R. Krishna',
            designation: 'HOD in Mathematics (JEE Specialist)',
            department: 'Mathematics',
            qualification: 'M.Tech (IIT Kharagpur)',
            experienceYrs: 15,
            photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
            bio: 'Master of coordinate geometry, vectors, and calculus shortcuts for high-speed accuracy in JEE Advanced.',
            displayOrder: 4,
          },
        ],
      });
    }

    const facilityCount = await prisma.collegeFacility.count({ where: { websiteId: website.id } });
    if (facilityCount === 0) {
      await prisma.collegeFacility.createMany({
        data: [
          {
            websiteId: website.id,
            title: 'Modern Science & Digital Laboratories',
            category: 'LAB',
            photoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
            description: 'Advanced Physics, Chemistry, and Biology laboratories equipped with computerized digital sensors, precision spectrometers, and research-grade microscopes.',
            displayOrder: 1,
          },
          {
            websiteId: website.id,
            title: 'Air-Conditioned Central Reading Library',
            category: 'LIBRARY',
            photoUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80',
            description: 'Over 25,000 reference books, previous year question archives, international journals, and quiet personalized cubicles for uninterrupted self-study.',
            displayOrder: 2,
          },
          {
            websiteId: website.id,
            title: 'Smart Interactive Touchscreen Classrooms',
            category: 'SMART_CLASS',
            photoUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
            description: 'Acoustically treated lecture halls equipped with 4K interactive digital whiteboards, lecture recording systems, and ergonomic seating.',
            displayOrder: 3,
          },
          {
            websiteId: website.id,
            title: 'Residential Hostels & Hygienic Dining',
            category: 'HOSTEL',
            photoUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
            description: 'Separate, 24/7 guarded residential blocks for boys and girls with study halls, mineral water plants, nutritious balanced meals, and resident faculty counselors.',
            displayOrder: 4,
          },
        ],
      });
    }

    const achievementCount = await prisma.collegeAchievement.count({ where: { websiteId: website.id } });
    if (achievementCount === 0) {
      await prisma.collegeAchievement.createMany({
        data: [
          {
            websiteId: website.id,
            studentName: 'T. V. Sai Kiran',
            examOrAward: 'NEET-UG 2024 State Rank 1',
            rankOrScore: 'AIR 24 • Score: 715/720',
            year: 2024,
            category: 'COMPETITIVE_EXAM',
            photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
            description: 'Admitted into AIIMS New Delhi (MBBS). Two-year classroom student at Andhra Inspire Academy.',
            displayOrder: 1,
          },
          {
            websiteId: website.id,
            studentName: 'M. Haritha Reddy',
            examOrAward: 'JEE Advanced 2024 State Topper',
            rankOrScore: 'AIR 46 • IIT Bombay CSE',
            year: 2024,
            category: 'COMPETITIVE_EXAM',
            photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
            description: 'Joined Computer Science & Engineering at IIT Bombay.',
            displayOrder: 2,
          },
          {
            websiteId: website.id,
            studentName: 'K. Sneha Latha',
            examOrAward: 'AP EAPCET 2024 1st Rank',
            rankOrScore: 'State Rank 1 (156.4/160)',
            year: 2024,
            category: 'COMPETITIVE_EXAM',
            photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
            description: 'Gold medalist in Intermediate MPC with 99.4% aggregate.',
            displayOrder: 3,
          },
          {
            websiteId: website.id,
            studentName: 'P. Rohit Varma',
            examOrAward: 'NEET-UG 2024',
            rankOrScore: 'AIR 82 • Score: 705/720',
            year: 2024,
            category: 'COMPETITIVE_EXAM',
            photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
            description: 'Admitted into JIPMER Puducherry (MBBS).',
            displayOrder: 4,
          },
        ],
      });
    }

    const testimonialCount = await prisma.collegeTestimonial.count({ where: { websiteId: website.id } });
    if (testimonialCount === 0) {
      await prisma.collegeTestimonial.createMany({
        data: [
          {
            websiteId: website.id,
            authorName: 'Dr. T. V. Sai Kiran',
            authorRole: 'Alumni (AIIMS New Delhi, AIR 24)',
            quote: 'The daily error analysis sessions and the computerized CBT practice at Andhra Inspire Academy gave me absolute confidence on exam day. The teachers treated us like family.',
            rating: 5,
            displayOrder: 1,
          },
          {
            websiteId: website.id,
            authorName: 'V. Sambasiva Rao',
            authorRole: 'Parent of Sneha Latha (State 1st Rank)',
            quote: 'As parents, we were always informed about her progress through weekly WhatsApp report cards and counselor calls. The academy’s discipline and hostel safety are unmatched.',
            rating: 5,
            displayOrder: 2,
          },
          {
            websiteId: website.id,
            authorName: 'M. Haritha Reddy',
            authorRole: 'Alumni (IIT Bombay CSE, AIR 46)',
            quote: 'The physics faculty here demystified the toughest JEE Advanced concepts. Andhra Inspire Academy provides the perfect environment for serious aspirants.',
            rating: 5,
            displayOrder: 3,
          },
        ],
      });
    }

    const galleryCount = await prisma.collegeGalleryItem.count({ where: { websiteId: website.id } });
    if (galleryCount === 0) {
      await prisma.collegeGalleryItem.createMany({
        data: [
          {
            websiteId: website.id,
            title: 'Modern Academic Campus Main Wing',
            category: 'CAMPUS',
            mediaUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
            displayOrder: 1,
          },
          {
            websiteId: website.id,
            title: 'Hands-on Chemistry Lab Session',
            category: 'LABS',
            mediaUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
            displayOrder: 2,
          },
          {
            websiteId: website.id,
            title: 'Interactive Lecture & Problem Solving',
            category: 'CAMPUS',
            mediaUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
            displayOrder: 3,
          },
          {
            websiteId: website.id,
            title: 'Annual Sports & Athletic Meet',
            category: 'SPORTS',
            mediaUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80',
            displayOrder: 4,
          },
          {
            websiteId: website.id,
            title: 'Toppers Convocation & Felicitation',
            category: 'EVENTS',
            mediaUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80',
            displayOrder: 5,
          },
          {
            websiteId: website.id,
            title: 'Quiet Study Reading Room',
            category: 'CAMPUS',
            mediaUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
            displayOrder: 6,
          },
        ],
      });
    }

    const jobCount = await prisma.collegeJobPosting.count({ where: { websiteId: website.id } });
    if (jobCount === 0) {
      await prisma.collegeJobPosting.createMany({
        data: [
          {
            websiteId: website.id,
            jobTitle: 'Senior Faculty in Physics (IIT-JEE Advanced Focus)',
            department: 'Physics',
            employmentType: 'FULL_TIME',
            vacanciesCount: 2,
            minExperienceYrs: 5,
            requiredQualifications: 'M.Sc. Physics / B.Tech from premier institute (IIT/NIT preferred)',
            jobDescription: 'Conduct lecture sessions for senior JEE batches, author challenging mock questions, and conduct error analysis clinics.',
            location: 'Vijayawada Main Campus',
            isActive: true,
          },
          {
            websiteId: website.id,
            jobTitle: 'Senior NEET Zoology Faculty (Class 11 & 12)',
            department: 'Biology',
            employmentType: 'FULL_TIME',
            vacanciesCount: 2,
            minExperienceYrs: 4,
            requiredQualifications: 'M.Sc. / Ph.D in Zoology with proven track record of mentoring top medical rankers',
            jobDescription: 'Deliver NCERT-aligned in-depth lectures, conduct weekly unit tests, and clarify individual doubts.',
            location: 'Vijayawada Main Campus',
            isActive: true,
          },
        ],
      });
    }

    return website;
  } catch (err) {
    console.error('Error ensuring demo college exists:', err);
    return null;
  }
}

module.exports = { ensureDemoCollegeExists };
