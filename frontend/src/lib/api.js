const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
const TOKEN_KEY = 'qf_auth_token';

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Session expired or invalid — clear the stale token so the app
    // naturally falls back to the login screen on next render.
    localStorage.removeItem(TOKEN_KEY);
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request('/health'),

  uploadFile: (file, opts = {}) => {
    const form = new FormData();
    form.append('file', file);
    const params = new URLSearchParams(opts).toString();
    return request(`/upload${params ? `?${params}` : ''}`, { method: 'POST', body: form });
  },
  uploadBatches: () => request('/upload/batches'),
  deleteUploadBatch: (id) => request(`/upload/batches/${id}`, { method: 'DELETE' }),

  listQuestions: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/questions${params ? `?${params}` : ''}`);
  },
  questionStats: () => request('/questions/stats'),
  bankAnalytics: () => request('/questions/bank-analytics'),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
  searchQuestionByImage: (formData) => request('/questions/search-image', { method: 'POST', body: formData }),

  // ---- Bulk question removal ----
  bulkPreview: (scope) => request('/questions/bulk/preview', { method: 'POST', body: JSON.stringify(scope) }),
  bulkRemove: (scope) => request('/questions/bulk/remove', { method: 'POST', body: JSON.stringify(scope) }),
  bulkRestore: (scope) => request('/questions/bulk/restore', { method: 'POST', body: JSON.stringify(scope) }),

  syllabusTree: () => request('/syllabus/tree'),
  updateChapterStatus: (id, data) => request(`/syllabus/chapter/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  importSyllabus: (formData) => request('/syllabus/import', { method: 'POST', body: formData }),

  // ---- Phase 2 ----
  runTagging: () => request('/tagging/run', { method: 'POST', body: JSON.stringify({}) }),
  reviewQueue: (page = 1) => request(`/tagging/review?page=${page}&pageSize=25`),
  reviewAction: (id, data) => request(`/tagging/review/${id}`, { method: 'POST', body: JSON.stringify(data) }),
  acceptAll: () => request('/tagging/accept-all', { method: 'POST', body: JSON.stringify({}) }),
  duplicates: () => request('/duplicates'),
  removeBulkDuplicates: () => request('/duplicates/bulk-remove', { method: 'POST' }),
  removeDuplicateIds: (ids) => request('/duplicates/remove-ids', { method: 'POST', body: JSON.stringify({ ids }) }),
  previewBatch: async (batchId) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${API_BASE}/questions/batch/${batchId}/preview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      let errText = await res.text();
      try { errText = JSON.parse(errText).error || errText; } catch(e){}
      throw new Error('Failed to load preview: ' + errText);
    }
    return res.blob();
  },

  // ---- Phase 3 ----
  generatePaper: (data) => request('/papers/generate', { method: 'POST', body: JSON.stringify(data) }),
  listPapers: () => request('/papers'),
  getPaper: (id, set = 'A') => request(`/papers/${id}${set ? `?set=${set}` : ''}`),
  getMasterKey: (id, optionFormat) => request(`/papers/${id}/master-key${optionFormat ? `?optionFormat=${optionFormat}` : ''}`),
  getPaperEcoStats: (id, opts = {}) => {
    const params = new URLSearchParams();
    if (opts.optionFormat) params.set('optionFormat', opts.optionFormat);
    if (opts.answerFormat) params.set('answerFormat', opts.answerFormat);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/papers/${id}/eco-stats${query}`);
  },
  swapQuestion: (paperId, questionId) => request(`/papers/${paperId}/swap`, { method: 'POST', body: JSON.stringify({ questionId }) }),
  finalizePaper: (id) => request(`/papers/${id}/finalize`, { method: 'POST', body: JSON.stringify({}) }),
  deletePaper: (id) => request(`/papers/${id}`, { method: 'DELETE' }),
  paperPdfUrl: (id, withAnswers) => `${API_BASE}/papers/${id}/pdf${withAnswers ? '?answers=1' : ''}`,

  /**
   * Downloads a paper's PDF using an authenticated request (a plain link
   * or window.open() cannot carry the login token, so a direct browser
   * navigation to this URL would get a 401 "not logged in" error even
   * for a properly logged-in user). This fetches the PDF as binary data
   * with the Authorization header attached, then triggers a real file
   * save using a temporary in-browser link.
   */
  downloadPaperPdf: async (id, withAnswers, filenameHint, optionFormat, answerFormat, set = 'A', isMasterKey = false, isBundle = false, watermarkOpts = {}, ecoMode = 'AUTO') => {
    const token = localStorage.getItem(TOKEN_KEY);
    const params = new URLSearchParams();
    if (withAnswers) params.set('answers', '1');
    if (optionFormat) params.set('optionFormat', optionFormat);
    if (answerFormat) params.set('answerFormat', answerFormat);
    if (set && !isMasterKey && !isBundle) params.set('set', set);
    if (isMasterKey) params.set('masterKey', '1');
    if (isBundle) params.set('bundle', '1');
    if (ecoMode) params.set('ecoMode', ecoMode);

    if (watermarkOpts.watermark !== undefined) {
      params.set('watermark', watermarkOpts.watermark ? '1' : '0');
    }
    if (watermarkOpts.wmText) params.set('wmText', watermarkOpts.wmText);
    if (watermarkOpts.wmType) params.set('wmType', watermarkOpts.wmType);
    if (watermarkOpts.wmOpacity) params.set('wmOpacity', watermarkOpts.wmOpacity);
    if (watermarkOpts.wmTagline) params.set('wmTagline', watermarkOpts.wmTagline);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/papers/${id}/pdf${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Could not download the PDF (${res.status}).`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filenameHint || 'question-paper.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  },

  /**
   * Downloads an optical-scanner-compatible printable 1-page A4 OMR evaluation sheet.
   */
  downloadOmrSheet: async (id, filenameHint, opts = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const params = new URLSearchParams();
    if (opts.layout) params.set('layout', opts.layout);
    if (opts.set) params.set('set', opts.set);
    if (opts.optionFormat) params.set('optionFormat', opts.optionFormat);
    if (opts.rollDigits) params.set('rollDigits', opts.rollDigits);
    if (opts.watermark !== undefined) params.set('watermark', opts.watermark ? '1' : '0');

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/papers/${id}/omr${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Could not download the OMR sheet (${res.status}).`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filenameHint || 'omr-evaluation-sheet.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  },

  /**
   * Downloads printable paper-saving answer key chits (slips) for student distribution.
   */
  downloadKeyChits: async (id, filenameHint, opts = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const params = new URLSearchParams();
    if (opts.mode) params.set('mode', opts.mode);
    if (opts.set) params.set('set', opts.set);
    if (opts.optionFormat) params.set('optionFormat', opts.optionFormat);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/papers/${id}/key-chits${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Could not download Key Chits (${res.status}).`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filenameHint || 'answer-key-chits.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  },

  // ---- Phase 4 ----
  runChecks: () => request('/checks/run', { method: 'POST', body: JSON.stringify({}) }),
  checksReview: (page = 1, subject = '') => request(`/checks/review?page=${page}&pageSize=25${subject ? `&subject=${subject}` : ''}`),
  checksReviewAction: (id, payload) => request(`/checks/review/${id}`, { method: 'POST', body: JSON.stringify(payload) }),
  submitBatchQc: (batchId) => request(`/questions/batch/${batchId}/submit-qc`, { method: 'POST' }),
  checksStats: () => request('/checks/stats'),
  chapterAnalytics: (chapterId) => request(`/syllabus/analytics?chapterId=${chapterId}`),

  // ---- Diagram images ----
  uploadImages: (files) => {
    const form = new FormData();
    for (const f of files) form.append('images', f);
    return request('/images/upload', { method: 'POST', body: form });
  },
  listImages: () => request('/images'),
  scanImageDuplicates: () => request('/images/duplicates'),
  deleteImage: (filename) => request(`/images/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  bulkDeleteImages: (filenames) => request('/images/bulk-delete', { method: 'POST', body: JSON.stringify({ filenames }) }),
  renameImage: (oldFilename, newFilename) => request('/images/rename', { method: 'POST', body: JSON.stringify({ oldFilename, newFilename }) }),
  imageBase: () => API_BASE.replace(/\/api$/, ''),

  // ---- Manual UPI recharge ----
  upiInfo: () => request('/recharge/upi-info'),
  setUpiInfo: (data) => request('/recharge/upi-info', { method: 'PUT', body: JSON.stringify(data) }),
  uploadUpiQr: (file) => {
    const form = new FormData();
    form.append('qr', file);
    return request('/recharge/upi-qr', { method: 'POST', body: form });
  },
  submitRecharge: (data) => request('/recharge/request', { method: 'POST', body: JSON.stringify(data) }),
  createRazorpayOrder: (amountRupees) => request('/recharge/razorpay/create', { method: 'POST', body: JSON.stringify({ amountRupees }) }),
  verifyRazorpayOrder: (data) => request('/recharge/razorpay/verify', { method: 'POST', body: JSON.stringify(data) }),
  myRecharges: () => request('/recharge/my-requests'),
  pendingRecharges: () => request('/recharge/pending'),
  allRecharges: () => request('/recharge/all'),
  getRevenue: () => request('/recharge/revenue'),
  approveRecharge: (id) => request(`/recharge/${id}/approve`, { method: 'POST' }),
  rejectRecharge: (id, reason) => request(`/recharge/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // ---- Exam Hub ----
  listExams: () => request('/exams'),
  syncExams: () => request('/exams/sync', { method: 'POST' }),
  deleteExam: (id) => request(`/exams/${id}`, { method: 'DELETE' }),
  getExamPattern: (examName) => request(`/exams/${encodeURIComponent(examName)}/pattern`),
  saveExamPattern: (examName, data) => request(`/exams/${encodeURIComponent(examName)}/pattern`, { method: 'PUT', body: JSON.stringify(data) }),
  getExamBlueprints: (examName) => request(`/exams/${encodeURIComponent(examName)}/blueprints`),
  saveExamBlueprint: (examName, data) => request(`/exams/${encodeURIComponent(examName)}/blueprints`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExamBlueprint: (examName, id) => request(`/exams/${encodeURIComponent(examName)}/blueprints/${id}`, { method: 'DELETE' }),

  // ---- Institutes (white-label branding) ----
  listInstitutes: () => request('/institutes'),
  createInstitute: (data) => request('/institutes', { method: 'POST', body: JSON.stringify(data) }),
  updateInstitute: (id, data) => request(`/institutes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInstitute: (id) => request(`/institutes/${id}`, { method: 'DELETE' }),
  myInstitute: () => request('/institutes/me'),
  updateMyInstitute: (data) => request('/institutes/me', { method: 'PATCH', body: JSON.stringify(data) }),
  createInstituteLogin: (id, data) => request(`/institutes/${id}/create-login`, { method: 'POST', body: JSON.stringify(data) }),
  getInstituteLoginInfo: (id) => request(`/institutes/${id}/login-info`),

  // ---- Trial/Demo logins + Credits (Stage 2) ----
  generateTrialLogin: (instituteName, phone) => request('/institutes/trial', { method: 'POST', body: JSON.stringify({ instituteName, phone }) }),
  listTrialAccounts: () => request('/institutes/trial/list'),
  updateTrialPhone: (id, phone) => request(`/institutes/${id}/trial-phone`, { method: 'PATCH', body: JSON.stringify({ phone }) }),
  addCredits: (id, amount, reason) => request(`/institutes/${id}/credits`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
  creditHistory: (id) => request(`/institutes/${id}/credit-history`),

  // ---- Phase 3: Online Student CBT Mode ----
  createCbtTest: (data) => request('/cbt/create', { method: 'POST', body: JSON.stringify(data) }),
  getCbtTestsForPaper: (paperId) => request(`/cbt/paper/${paperId}`),
  getCbtTestInfo: (code) => request(`/cbt/test/${code}`),
  verifyCbtStudent: (code, data) => request(`/cbt/test/${code}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  submitCbtExam: (code, data) => request(`/cbt/test/${code}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  getCbtLeaderboard: (code) => request(`/cbt/test/${code}/leaderboard`),
  deleteCbtSubmission: (code, subId) => request(`/cbt/test/${code}/submissions/${subId}`, { method: 'DELETE' }),
  toggleCbtStatus: (code, status) => request(`/cbt/test/${code}/toggle-status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ---- Authentication ----
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getRegistrationRequests: () => request('/auth/register/requests'),
  approveRegistration: (id) => request(`/auth/register/approve-access/${id}`, { method: 'POST' }),
  rejectRegistration: (id) => request(`/auth/register/reject-access/${id}`, { method: 'POST' }),
  requestAccess: (formData) => request('/auth/register/request-access', { method: 'POST', body: formData }),
  requestOtp: (phone) => request('/auth/register/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (payload) => request('/auth/register/otp/verify', { method: 'POST', body: JSON.stringify(payload) }),
  signup: (instituteName, email, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ instituteName, email, password }) }),
  getCurrentUser: () => request('/auth/me'),
  verifyTwoFactorLogin: (pendingToken, code) => request('/auth/2fa/verify-login', { method: 'POST', body: JSON.stringify({ pendingToken, code }) }),
  setupTwoFactor: () => request('/auth/2fa/setup', { method: 'POST' }),
  enableTwoFactor: (secret, code) => request('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ secret, code }) }),
  disableTwoFactor: (code) => request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, newPassword) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  // ---- Phase 12: Smart Exam Results & WhatsApp Parent Communication ----
  generateResultsFromCbt: (cbtTestId) => request(`/results/generate-from-cbt/${cbtTestId}`, { method: 'POST' }),
  uploadOfflineResults: (data) => request('/results/offline-upload', { method: 'POST', body: JSON.stringify(data) }),
  getPaperResults: (paperId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/results/paper/${paperId}${params ? `?${params}` : ''}`);
  },
  getStudentResult: (resultId) => request(`/results/student/${resultId}`),
  previewResultWhatsApp: (resultId) => request(`/results/${resultId}/whatsapp-preview`),
  sendResultWhatsApp: (resultId, forceRetry = false) => request(`/results/${resultId}/whatsapp-send`, { method: 'POST', body: JSON.stringify({ forceRetry }) }),
  batchSendWhatsApp: (paperId, options = {}) => request(`/results/paper/${paperId}/batch-whatsapp-send`, { method: 'POST', body: JSON.stringify(options) }),
  getWhatsAppLedger: () => request('/results/whatsapp/ledger'),
  rechargeWhatsAppWallet: (amountRupees) => request('/results/whatsapp/wallet-recharge', { method: 'POST', body: JSON.stringify({ amountRupees }) }),
  getPublicResult: (token) => request(`/public/results/${token}`),

  // Milestone 2: Student Analytics & Batch Reporting
  getAnalyticsStudentsList: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/results/analytics/students-list${params ? `?${params}` : ''}`);
  },
  getStudentAnalytics: (rollNumber) => request(`/results/analytics/student/${encodeURIComponent(rollNumber)}`),
  getBatchAnalytics: (paperId) => request(`/results/analytics/batch/${paperId}`),
};
