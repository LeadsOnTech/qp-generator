const fs = require("fs");
let content = fs.readFileSync("frontend/src/components/Layout.jsx", "utf8");

content = content.replace(
  "{ to: '/recharge-approvals', label: 'Recharge Approvals'",
  "{ to: '/admin/registrations', label: 'Registration Requests', icon: '👤' },\n  { to: '/recharge-approvals', label: 'Recharge Approvals'"
);

fs.writeFileSync("frontend/src/components/Layout.jsx", content, "utf8");
