const fs = require("fs");
let content = fs.readFileSync("frontend/src/App.jsx", "utf8");

content = content.replace(
  "import RechargeApprovals from './pages/RechargeApprovals';",
  "import RechargeApprovals from './pages/RechargeApprovals';\nimport RegistrationApprovals from './pages/RegistrationApprovals';"
);

content = content.replace(
  "<Route path=\"/admin/recharges\" element={<RechargeApprovals />} />",
  "<Route path=\"/admin/recharges\" element={<RechargeApprovals />} />\n          <Route path=\"/admin/registrations\" element={<RegistrationApprovals />} />"
);

fs.writeFileSync("frontend/src/App.jsx", content, "utf8");
