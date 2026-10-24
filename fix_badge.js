const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PricingPage.jsx", "utf8");

const oldBadge = `<div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#22C55E', fontWeight: 600, fontSize: 15 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          Start with 200 Free Credits
        </div>`;

const newBadge = `<div style={{ marginTop: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '12px 24px', borderRadius: '100px', color: '#4ADE80', fontWeight: 800, fontSize: 16, boxShadow: '0 0 32px rgba(34, 197, 94, 0.2)' }}>
          <div style={{ background: '#22C55E', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          Every new account gets 200 FREE CREDITS!
        </div>`;

content = content.replace(oldBadge, newBadge);

fs.writeFileSync("frontend/src/pages/PricingPage.jsx", content, "utf8");
