const fs = require("fs");
let content = fs.readFileSync("frontend/src/components/Layout.jsx", "utf8");

content = content.replace(
  "{ to: '/recharge-approvals', label: 'Recharge Approvals', icon: 'dY\\'3' },",
  "{ to: '/admin/registrations', label: 'Registration Requests', icon: 'dY\\'3' },\n  { to: '/recharge-approvals', label: 'Recharge Approvals', icon: 'dY\\'3' },"
);

fs.writeFileSync("frontend/src/components/Layout.jsx", content, "utf8");
