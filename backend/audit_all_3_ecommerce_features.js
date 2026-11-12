// backend/audit_all_3_ecommerce_features.js
const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'qp-generator-prod-jwt-secret-key-2026';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode, data: json, raw });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('🛒 UNIFIED VERIFICATION AUDIT: ALL 3 E-COMMERCE FEATURES');
  console.log('================================================================\n');

  try {
    // 0. Setup Test Data
    const collegeA = await prisma.institute.findFirst({ where: { slug: 'andhra-inspire-academy' } })
      || await prisma.institute.findFirst();
    const collegeB = await prisma.institute.findFirst({ where: { id: { not: collegeA.id } } });

    const adminUserA = await prisma.user.findFirst({ where: { instituteId: collegeA.id } });
    const superAdminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    const collegeTokenA = jwt.sign({ id: adminUserA.id, role: adminUserA.role, instituteId: collegeA.id }, JWT_SECRET);
    const superAdminToken = jwt.sign({ id: superAdminUser.id, role: 'ADMIN', instituteId: null }, JWT_SECRET);

    // Create a digital book and a physical book for College A
    const digitalBook = await prisma.marketplaceBook.create({
      data: {
        institute: { connect: { id: collegeA.id } },
        title: 'Audit Digital Masterclass PDF',
        author: 'Faculty Team',
        subject: 'Mathematics',
        fulfillmentType: 'DIGITAL_PDF',
        priceRupees: 299,
        pageCount: 50,
        fileKey: 'test.pdf',
        isGlobal: true,
        moderationStatus: 'APPROVED_GLOBAL',
        isActive: true
      }
    });

    const physicalBook = await prisma.marketplaceBook.create({
      data: {
        institute: { connect: { id: collegeA.id } },
        title: 'Audit Physical Hardbound Textbook',
        author: 'Senior Faculty',
        subject: 'Physics',
        fulfillmentType: 'PHYSICAL_PRINT',
        priceRupees: 599,
        fileKey: 'audit_phys_key_' + Date.now(),
        stockQuantity: 5,
        isGlobal: true,
        moderationStatus: 'APPROVED_GLOBAL',
        isActive: true
      }
    });

    const outOfStockBook = await prisma.marketplaceBook.create({
      data: {
        institute: { connect: { id: collegeA.id } },
        title: 'Audit Sold Out Handbook',
        author: 'Department',
        subject: 'Chemistry',
        fulfillmentType: 'PHYSICAL_PRINT',
        priceRupees: 450,
        fileKey: 'audit_oos_key_' + Date.now(),
        stockQuantity: 0,
        isGlobal: true,
        moderationStatus: 'APPROVED_GLOBAL',
        isActive: true
      }
    });

    // -------------------------------------------------------------
    // FEATURE 1: STUDENT STOREFRONT & CHECKOUT FLOW (Phase 2C)
    // -------------------------------------------------------------
    console.log('--- FEATURE 1: STUDENT STOREFRONT & CHECKOUT FLOW ---');

    // Test 1: Digital checkout validation
    const digMissing = await request('POST', '/api/marketplace/checkout/create-order', {
      bookId: digitalBook.id,
      buyerName: 'Ravi',
      buyerPhone: '123' // invalid phone
    });
    assert(digMissing.status === 400, 'Rejects invalid phone number for digital checkout');

    // Test 2: Valid digital order creation
    const digOrder = await request('POST', '/api/marketplace/checkout/create-order', {
      bookId: digitalBook.id,
      buyerName: 'Ravi Teja',
      buyerPhone: '9876543210',
      buyerEmail: 'ravi@example.com'
    });
    assert(digOrder.status === 200 && digOrder.data.success, 'Digital order created with instant download token');
    assert(digOrder.data.downloadToken && digOrder.data.downloadUrl, 'Instant download token generated for digital order');

    // Test 3: Physical checkout validation - missing address
    const physMissingAddr = await request('POST', '/api/marketplace/checkout/create-order', {
      bookId: physicalBook.id,
      buyerName: 'Ananya Rao',
      buyerPhone: '9123456789'
    });
    assert(physMissingAddr.status === 400, 'Rejects physical checkout when shipping address is missing');

    // Test 4: Physical checkout validation - invalid pincode
    const physInvalidPin = await request('POST', '/api/marketplace/checkout/create-order', {
      bookId: physicalBook.id,
      buyerName: 'Ananya Rao',
      buyerPhone: '9123456789',
      shippingAddress: {
        addressLine1: 'Door 4-12, MG Road',
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        pincode: '5200' // only 4 digits
      }
    });
    assert(physInvalidPin.status === 400, 'Rejects physical checkout when pincode is not 6 digits');

    // Test 5: Out of stock guard
    const outOfStockRes = await request('POST', '/api/marketplace/checkout/create-order', {
      bookId: outOfStockBook.id,
      buyerName: 'Ananya Rao',
      buyerPhone: '9123456789',
      shippingAddress: {
        addressLine1: 'Door 4-12, MG Road',
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        pincode: '520001'
      }
    });
    assert(outOfStockRes.status === 400 && outOfStockRes.data.error.includes('stock'), 'Rejects checkout when physical book stock is zero');

    // Test 6: Valid physical order creation with stock decrement & shipment manifestation
    const physOrder = await request('POST', '/api/marketplace/checkout/create-order', {
      bookId: physicalBook.id,
      buyerName: 'Ananya Rao',
      buyerPhone: '9123456789',
      buyerEmail: 'ananya@example.com',
      shippingAddress: {
        addressLine1: 'Door 4-12, MG Road',
        addressLine2: 'Opposite State Library',
        city: 'Vijayawada',
        district: 'Krishna',
        state: 'Andhra Pradesh',
        pincode: '520001'
      }
    });
    assert(physOrder.status === 200 && physOrder.data.success, 'Physical order created successfully');

    const updatedPhysBook = await prisma.marketplaceBook.findUnique({ where: { id: physicalBook.id } });
    assert(updatedPhysBook.stockQuantity === 4, `Stock decremented from 5 to 4 (actual: ${updatedPhysBook.stockQuantity})`);

    const physDbOrder = await prisma.marketplaceOrder.findUnique({ where: { orderNumber: physOrder.data.orderNumber } });
    const shipmentRecord = await prisma.marketplaceShipment.findUnique({ where: { orderId: physDbOrder.id } });
    assert(shipmentRecord && shipmentRecord.status === 'MANIFESTED', 'MarketplaceShipment record created with status MANIFESTED');

    const addressRecord = await prisma.marketplaceShippingAddress.findUnique({ where: { orderId: physDbOrder.id } });
    assert(addressRecord && addressRecord.pincode === '520001' && addressRecord.city === 'Vijayawada', 'MarketplaceShippingAddress correctly recorded with full shipping details');

    // -------------------------------------------------------------
    // FEATURE 2: LIVE PAYMENT GATEWAY INTEGRATION (Phase 3)
    // -------------------------------------------------------------
    console.log('\n--- FEATURE 2: LIVE PAYMENT GATEWAY INTEGRATION ---');

    // Test 7: Create Razorpay Order
    const rzpOrderRes = await request('POST', '/api/marketplace/checkout/create-razorpay-order', {
      bookId: physicalBook.id,
      buyerName: 'Vikram Seth',
      buyerPhone: '9848012345',
      buyerEmail: 'vikram@example.com',
      shippingAddress: {
        addressLine1: 'Flat 302, Sai Residency',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        pincode: '522002'
      }
    });
    assert(rzpOrderRes.status === 200 && rzpOrderRes.data.razorpayOrderId, 'Creates Razorpay order in paise with gateway order ID');
    assert(rzpOrderRes.data.amountPaise === 63900, `Amount in paise is integer 63,900 (₹599 book + ₹40 courier) (actual: ${rzpOrderRes.data.amountPaise})`);

    // Test 7B: Shipping estimate for 2.5 kg heavy material package to Delhi (National Zone)
    const heavyEstimate = await request('GET', '/api/marketplace/shipping-estimate?weightGrams=2500&pincode=110001');
    assert(heavyEstimate.status === 200 && heavyEstimate.data.slabs === 5, 'Calculates 5 slabs of 500g for 2.5 kg study kit');
    assert(heavyEstimate.data.shippingFee === 205 || heavyEstimate.data.shippingFee === 210, `Calculates national express courier for 2.5 kg (actual: ₹${heavyEstimate.data.shippingFee})`);
    
    // Test 8: Ensure order is in PENDING status and stock is NOT prematurely decremented
    const rzpDbOrder = await prisma.marketplaceOrder.findFirst({
      where: { razorpayOrderId: rzpOrderRes.data.razorpayOrderId }
    });
    assert(rzpDbOrder && rzpDbOrder.paymentStatus === 'PENDING', 'Database order recorded with paymentStatus: PENDING');
    const physBookPreVerify = await prisma.marketplaceBook.findUnique({ where: { id: physicalBook.id } });
    assert(physBookPreVerify.stockQuantity === 4, 'Stock NOT prematurely decremented while payment is PENDING');

    // Test 9: Tampered Razorpay Signature rejected
    const tamperedRes = await request('POST', '/api/marketplace/checkout/verify-payment', {
      orderId: rzpOrderRes.data.orderId,
      razorpay_order_id: rzpOrderRes.data.razorpayOrderId,
      razorpay_payment_id: 'pay_tampered_12345',
      razorpay_signature: 'invalid_forged_signature_hex'
    });
    assert(tamperedRes.status === 400 && !tamperedRes.data.success, 'Forged/tampered Razorpay signature strictly rejected with HTTP 400');

    // Test 10: Valid Razorpay Signature verified
    const validVerifyRes = await request('POST', '/api/marketplace/checkout/verify-payment', {
      orderId: rzpOrderRes.data.orderId,
      razorpay_order_id: rzpOrderRes.data.razorpayOrderId,
      razorpay_payment_id: 'pay_mock_verified_99999',
      razorpay_signature: 'test_signature_mock'
    });
    assert(validVerifyRes.status === 200 && validVerifyRes.data.success, 'Valid payment signature verified and order confirmed');

    // Test 11: Upon verification, order status is COMPLETED and stock is decremented
    const completedOrder = await prisma.marketplaceOrder.findFirst({
      where: { razorpayOrderId: rzpOrderRes.data.razorpayOrderId }
    });
    assert(completedOrder.paymentStatus === 'COMPLETED', 'Order status atomically transitioned to COMPLETED');
    const physBookPostVerify = await prisma.marketplaceBook.findUnique({ where: { id: physicalBook.id } });
    assert(physBookPostVerify.stockQuantity === 3, `Stock decremented upon payment confirmation to 3 (actual: ${physBookPostVerify.stockQuantity})`);

    // Test 12: Shipment manifested for paid physical book
    const paidShipment = await prisma.marketplaceShipment.findUnique({ where: { orderId: completedOrder.id } });
    assert(paidShipment && paidShipment.status === 'MANIFESTED', 'Shipment manifested upon verified payment');

    // Test 13: Idempotent replay of verify-payment
    const replayRes = await request('POST', '/api/marketplace/checkout/verify-payment', {
      orderId: rzpOrderRes.data.orderId,
      razorpay_order_id: rzpOrderRes.data.razorpayOrderId,
      razorpay_payment_id: 'pay_mock_verified_99999',
      razorpay_signature: 'test_signature_mock'
    });
    assert(replayRes.status === 200 && replayRes.data.alreadyProcessed, 'Replay payment verification returns alreadyProcessed without re-decrementing stock');
    const physBookReplay = await prisma.marketplaceBook.findUnique({ where: { id: physicalBook.id } });
    assert(physBookReplay.stockQuantity === 3, 'Stock maintained at 3, no double decrement on replay');

    // -------------------------------------------------------------
    // FEATURE 3: DELIVERY, ANTI-PIRACY DRM & DISPATCH & PAYOUTS (Phase 4)
    // -------------------------------------------------------------
    console.log('\n--- FEATURE 3: DELIVERY, ANTI-PIRACY DRM, DISPATCH & PAYOUTS ---');

    // Test 14: PDF Watermarking library check
    const { watermarkPdf } = require('./src/lib/watermarkPdf');
    assert(typeof watermarkPdf === 'function', 'watermarkPdf function is exported and accessible');

    // Test 15: College Admin dispatches shipment
    const dispatchRes = await request(
      'PUT',
      `/api/marketplace/seller/orders/${completedOrder.id}/dispatch`,
      {
        carrierName: 'DTDC Express',
        trackingNumber: 'DTDC987654321IN'
      },
      { Authorization: `Bearer ${collegeTokenA}` }
    );
    assert(dispatchRes.status === 200 && dispatchRes.data.success, 'College Admin successfully dispatches physical order');
    assert(dispatchRes.data.shipment && dispatchRes.data.shipment.status === 'DISPATCHED', 'Shipment status transitioned to DISPATCHED');
    assert(dispatchRes.data.shipment.trackingUrl && dispatchRes.data.shipment.trackingUrl.includes('dtdc.in'), 'Tracking URL automatically generated for DTDC');

    // Test 16: Non-seller college blocked from dispatching
    if (collegeB) {
      const userB = await prisma.user.findFirst({ where: { instituteId: collegeB.id } });
      if (userB) {
        const collegeTokenB = jwt.sign({ id: userB.id, role: userB.role, instituteId: collegeB.id }, JWT_SECRET);
        const forbiddenDispatch = await request(
          'PUT',
          `/api/marketplace/seller/orders/${completedOrder.id}/dispatch`,
          { carrierName: 'Delhivery', trackingNumber: 'DEL123' },
          { Authorization: `Bearer ${collegeTokenB}` }
        );
        assert(forbiddenDispatch.status === 404 || forbiddenDispatch.status === 403, 'Cross-tenant isolation: College B strictly blocked from College A order dispatch');
      }
    }

    // Test 17: Seller Earnings calculation
    const earningsRes = await request(
      'GET',
      '/api/marketplace/institute/earnings',
      null,
      { Authorization: `Bearer ${collegeTokenA}` }
    );
    assert(earningsRes.status === 200 && earningsRes.data.success, 'Seller earnings and orders fetched successfully');
    const accruedBalance = earningsRes.data.institute ? earningsRes.data.institute.totalEarningsRupees : 0;
    assert(accruedBalance > 0, `Accrued commission balance is positive (₹${accruedBalance})`);

    // Test 18: College Admin requests payout exceeding balance -> Rejected
    const excessivePayout = await request(
      'POST',
      '/api/marketplace/seller/payout-request',
      {
        requestedAmountRupees: accruedBalance + 10000,
        bankAccountName: 'Andhra Inspire Society',
        bankAccountNumber: '998877665544',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India'
      },
      { Authorization: `Bearer ${collegeTokenA}` }
    );
    assert(excessivePayout.status === 400 && excessivePayout.data.error.includes('balance'), 'Payout request exceeding accrued balance rejected');

    // Test 19: College Admin requests payout with invalid IFSC -> Rejected
    const invalidIfscPayout = await request(
      'POST',
      '/api/marketplace/seller/payout-request',
      {
        requestedAmountRupees: 100,
        bankAccountName: 'Andhra Inspire Society',
        bankAccountNumber: '998877665544',
        bankIfsc: 'INVALID_IFSC',
        bankName: 'State Bank of India'
      },
      { Authorization: `Bearer ${collegeTokenA}` }
    );
    assert(invalidIfscPayout.status === 400 && invalidIfscPayout.data.error.includes('IFSC'), 'Payout request with invalid IFSC format rejected');

    // Test 20: Valid Payout Request submitted
    // Clean up any stale pending requests first
    await prisma.marketplacePayoutRequest.deleteMany({ where: { instituteId: collegeA.id, status: 'PENDING' } });

    const validPayout = await request(
      'POST',
      '/api/marketplace/seller/payout-request',
      {
        requestedAmountRupees: 150,
        bankAccountName: 'Andhra Inspire Society',
        bankAccountNumber: '998877665544',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        upiId: 'andhra@upi'
      },
      { Authorization: `Bearer ${collegeTokenA}` }
    );
    assert(validPayout.status === 200 && validPayout.data.success, 'Valid settlement payout request created with status PENDING');
    const payoutRequestId = validPayout.data.payoutRequest.id;

    // Test 21: Duplicate pending payout request blocked
    const duplicatePayout = await request(
      'POST',
      '/api/marketplace/seller/payout-request',
      {
        requestedAmountRupees: 50,
        bankAccountName: 'Andhra Inspire Society',
        bankAccountNumber: '998877665544',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India'
      },
      { Authorization: `Bearer ${collegeTokenA}` }
    );
    assert(duplicatePayout.status === 400 && duplicatePayout.data.error.includes('pending'), 'Duplicate payout request blocked while prior request is PENDING');

    // Test 22: College Admin views payout requests list
    const sellerPayouts = await request(
      'GET',
      '/api/marketplace/seller/payout-requests',
      null,
      { Authorization: `Bearer ${collegeTokenA}` }
    );
    assert(sellerPayouts.status === 200 && Array.isArray(sellerPayouts.data.requests) && sellerPayouts.data.requests.length > 0, 'Seller can list their own payout requests');

    // Test 23: Super Admin reviews payout queue
    const adminPayouts = await request(
      'GET',
      '/api/marketplace/admin/payout-requests',
      null,
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(adminPayouts.status === 200 && Array.isArray(adminPayouts.data.requests), 'Super Admin views college settlement queue');

    // Test 24: Super Admin processes payout disbursement with UTR & auto-deducts balance
    const balanceBeforeDisburse = (await prisma.institute.findUnique({ where: { id: collegeA.id } })).marketplaceEarningsPaise || 0;
    const processRes = await request(
      'POST',
      `/api/marketplace/admin/payout-requests/${payoutRequestId}/process`,
      {
        action: 'SETTLE',
        transactionRef: 'UTR-HDFC-9911223344',
        adminNotes: 'Settled via NEFT bank transfer'
      },
      { Authorization: `Bearer ${superAdminToken}` }
    );
    assert(processRes.status === 200 && processRes.data.success, 'Super Admin approves payout disbursement with UTR reference number');

    const balanceAfterDisburse = (await prisma.institute.findUnique({ where: { id: collegeA.id } })).marketplaceEarningsPaise || 0;
    const expectedDeduction = 150 * 100; // 15,000 paise
    assert(balanceBeforeDisburse - balanceAfterDisburse === expectedDeduction, `Accrued balance atomically reduced by ₹150 (before: ${balanceBeforeDisburse}, after: ${balanceAfterDisburse})`);

    const settledPayout = await prisma.marketplacePayoutRequest.findUnique({ where: { id: payoutRequestId } });
    assert(settledPayout.status === 'SETTLED' && settledPayout.transactionRef === 'UTR-HDFC-9911223344', 'Payout record updated to SETTLED with UTR reference');

    // -------------------------------------------------------------
    // Cleanup temporary test books and orders
    // -------------------------------------------------------------
    await prisma.marketplaceShipment.deleteMany({ where: { order: { bookId: { in: [digitalBook.id, physicalBook.id, outOfStockBook.id] } } } });
    await prisma.marketplaceShippingAddress.deleteMany({ where: { order: { bookId: { in: [digitalBook.id, physicalBook.id, outOfStockBook.id] } } } });
    await prisma.marketplaceLedgerEntry.deleteMany({ where: { order: { bookId: { in: [digitalBook.id, physicalBook.id, outOfStockBook.id] } } } });
    await prisma.marketplaceOrder.deleteMany({ where: { bookId: { in: [digitalBook.id, physicalBook.id, outOfStockBook.id] } } });
    await prisma.marketplacePayoutRequest.deleteMany({ where: { id: payoutRequestId } });
    await prisma.marketplaceBook.deleteMany({ where: { id: { in: [digitalBook.id, physicalBook.id, outOfStockBook.id] } } });

    console.log('\n================================================================');
    console.log(`🎉 UNIFIED AUDIT FINISHED: ${passCount} Passed, ${failCount} Failed`);
    console.log('================================================================');

  } catch (err) {
    console.error('Fatal audit failure:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
