const fs = require("fs");
let content = fs.readFileSync("frontend/src/lib/api.js", "utf8");

content = content.replace(
  "approveRegistration: (id) => request(`/auth/register/approve-access/${id}`, { method: 'POST' }),",
  "approveRegistration: (id) => request(`/auth/register/approve-access/${id}`, { method: 'POST' }),\n  rejectRegistration: (id) => request(`/auth/register/reject-access/${id}`, { method: 'POST' }),"
);

fs.writeFileSync("frontend/src/lib/api.js", content, "utf8");
