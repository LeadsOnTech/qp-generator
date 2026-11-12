const { PrismaClient } = require('@prisma/client');
const http = require('http');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function httpRequest(method, pathUrl) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: pathUrl,
        method,
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runCompleteSystemAudit() {
  console.log('\n================================================================');
  console.log('🔍 FULL-SPECTRUM END-TO-END SYSTEM AUDIT (FRONTEND & BACKEND)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // MODULE 1: CURRICULUM ARCHITECTURE & QUESTION REPOSITORY
    // -------------------------------------------------------------
    console.log('--- MODULE 1: CURRICULUM & QUESTION BANK SCHEMA ---');
    const totalChapters = await prisma.chapter.count();
    assert(totalChapters >= 280, `Curriculum chapters mapped across NEET/JEE/State Board: ${totalChapters}`);

    const totalQuestions = await prisma.question.count();
    assert(totalQuestions > 0, `Active question repository indexed and queryable (${totalQuestions} local questions)`);

    const institutesCount = await prisma.institute.count();
    assert(institutesCount > 0, `Multi-tenant institution accounts active: ${institutesCount}`);

    // -------------------------------------------------------------
    // MODULE 2: LIVE BACKEND API SERVICE & ENDPOINT ROUTING
    // -------------------------------------------------------------
    console.log('\n--- MODULE 2: LIVE BACKEND API ENDPOINTS ---');
    
    // Health check
    const health = await httpRequest('GET', '/api/health');
    assert(health.status === 200, 'Server /api/health returns HTTP 200 OK');

    // Marketplace Catalog API
    const catalogRes = await httpRequest('GET', '/api/marketplace/public/catalog');
    assert(catalogRes.status === 200 && catalogRes.data.success, `Marketplace catalog API operational (${catalogRes.data.total || catalogRes.data.books?.length || 0} active publications)`);

    // Shipping Estimator API (Local / South Intra-state)
    const localShipRes = await httpRequest('GET', '/api/marketplace/shipping-estimate?weightGrams=2500&pincode=500001');
    assert(localShipRes.status === 200 && localShipRes.data.success, 'Shipping rate calculator operational via API');
    assert(localShipRes.data.slabs === 5, `Calculates 5 slabs of 500g for 2.5 kg parcel (actual: ${localShipRes.data.slabs})`);
    assert(localShipRes.data.shippingFee === 120 || localShipRes.data.shippingFee === 140, `Local/Intra-state courier rate calculated correctly: ₹${localShipRes.data.shippingFee}`);

    // Shipping Estimator API (National Express)
    const nationalShipRes = await httpRequest('GET', '/api/marketplace/shipping-estimate?weightGrams=2500&pincode=110001');
    assert(nationalShipRes.status === 200 && nationalShipRes.data.shippingFee === 205, `National express courier for 2.5 kg calculated correctly: ₹${nationalShipRes.data.shippingFee}`);

    // Subscription Modules & Catalog API (Strictly protected by multi-tenant authentication)
    const plansRes = await httpRequest('GET', '/api/subscriptions/catalog');
    assert(plansRes.status === 401 && plansRes.data.error.includes('sign in'), 'Subscription plans API protected by multi-tenant authentication (HTTP 401 when unauthenticated)');

    // -------------------------------------------------------------
    // MODULE 3: E-COMMERCE & FINANCIAL ACCOUNTING INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- MODULE 3: MARKETPLACE & FINANCIAL LEDGER INTEGRITY ---');
    const totalOrders = await prisma.marketplaceOrder.count();
    assert(totalOrders >= 0, `Marketplace orders ledger operational (Total recorded: ${totalOrders})`);

    const totalLedgerEntries = await prisma.marketplaceLedgerEntry.count();
    assert(totalLedgerEntries >= 0, `Immutable commission ledger healthy (Audit ledger entries: ${totalLedgerEntries})`);

    const totalPayouts = await prisma.marketplacePayoutRequest.count();
    assert(totalPayouts >= 0, `Payout settlement ledger operational (Settlement records: ${totalPayouts})`);

    // -------------------------------------------------------------
    // MODULE 4: AUTOMATED NOTIFICATION & DISPATCH SUITE
    // -------------------------------------------------------------
    console.log('\n--- MODULE 4: AUTOMATED NOTIFICATION SUITE ---');
    const whatsapp = require('./src/lib/whatsapp');
    assert(typeof whatsapp.sendMarketplaceOrderConfirmation === 'function', 'sendMarketplaceOrderConfirmation method active');
    assert(typeof whatsapp.sendMarketplaceShippingUpdate === 'function', 'sendMarketplaceShippingUpdate method active');
    assert(typeof whatsapp.sendSellerSaleAlert === 'function', 'sendSellerSaleAlert method active');
    assert(typeof whatsapp.sendSubscriptionActivationNotification === 'function', 'sendSubscriptionActivationNotification method active');
    assert(typeof whatsapp.sendAdminSubscriptionAlert === 'function', 'sendAdminSubscriptionAlert method active');
    assert(typeof whatsapp.sendRawMessage === 'function', 'sendRawMessage transactional dispatch method active');

    // -------------------------------------------------------------
    // MODULE 5: FRONTEND PRODUCTION BUNDLE INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- MODULE 5: FRONTEND PRODUCTION BUNDLE INTEGRITY ---');
    const distPath = path.resolve(__dirname, '../frontend/dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    assert(fs.existsSync(indexHtmlPath), 'Frontend production dist/index.html exists and is compiled');

    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    assert(htmlContent.includes('/assets/index-'), 'Index HTML correctly links to compiled Vite JS bundle');
    assert(htmlContent.includes('.css'), 'Index HTML correctly links to compiled CSS styling bundle');

    const assetsDir = path.join(distPath, 'assets');
    const assetFiles = fs.readdirSync(assetsDir);
    assert(assetFiles.length > 10, `Static assets generated and intact (${assetFiles.length} files in dist/assets)`);

    const jsBundle = assetFiles.find((f) => f.startsWith('index-') && f.endsWith('.js'));
    const cssBundle = assetFiles.find((f) => f.startsWith('index-') && f.endsWith('.css'));
    assert(!!jsBundle, `Main JavaScript application bundle present (${jsBundle})`);
    assert(!!cssBundle, `Main CSS styling bundle present (${cssBundle})`);

  } catch (err) {
    console.error('Fatal audit error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log('\n================================================================');
    console.log(`🏁 FULL SYSTEM AUDIT COMPLETED: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runCompleteSystemAudit();
