const fs = require("fs");
let content = fs.readFileSync("frontend/src/lib/api.js", "utf8");

content = content.replace(
  "requestAccess: (formData)",
  "getRegistrationRequests: () => request('/auth/register/requests'),\n  approveRegistration: (id) => request(`/auth/register/approve-access/${id}`, { method: 'POST' }),\n  requestAccess: (formData)"
);

fs.writeFileSync("frontend/src/lib/api.js", content, "utf8");
