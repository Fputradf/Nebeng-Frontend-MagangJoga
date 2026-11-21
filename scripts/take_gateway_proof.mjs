import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mariadb = require('C:\\Users\\Fput\\Documents\\Nebeng\\Nebeng-Backend\\node_modules\\mariadb\\dist\\promise.cjs');

const outDir = 'C:\\Users\\Fput\\.gemini\\antigravity\\brain\\531d8013-e188-4f36-90f6-21156a9a62ec';
fs.mkdirSync(outDir, { recursive: true });

async function resetDbOrder() {
  const conn = await mariadb.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    database: 'nebeng'
  });
  await conn.query("UPDATE orders SET status='pending_payment', escrow_status='pending' WHERE id=38");
  await conn.query("UPDATE payments SET status='PENDING' WHERE order_id=38");
  const [row] = await conn.query("SELECT id, status, escrow_status, customer_id FROM orders WHERE id=38");
  console.log('✅ Order in DB:', row);
  await conn.end();
}

async function loginApi(email, password) {
  const resp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!resp.ok) {
    throw new Error(`Failed to login for ${email}: ${resp.status}`);
  }
  return await resp.json();
}

async function setPaymentMode(token, mode) {
  const resp = await fetch('http://localhost:3000/api/payments/admin/config', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ activeMode: mode })
  });
  if (!resp.ok) {
    throw new Error(`Failed to set payment mode: ${resp.status}`);
  }
  return await resp.json();
}

async function main() {
  console.log('1. Resetting test order in DB...');
  await resetDbOrder();

  console.log('2. Logging in admin & customer...');
  const adminData = await loginApi('admin@nebeng.com', 'Admin@12345');
  const customerData = await loginApi('customer.jogja@nebeng.com', 'Customer@12345');

  console.log('3. Setting payment mode to GATEWAY (Opsi A)...');
  await setPaymentMode(adminData.accessToken, 'GATEWAY');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // --- SCREENSHOT 1: Superadmin Panel with Gateway Active ---
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((auth) => {
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
    const json = JSON.stringify({
      role: 'admin',
      token: auth.accessToken,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      email: auth.user.email,
      name: auth.user.name,
      user: auth.user,
      loggedInAt: Date.now()
    });
    sessionStorage.setItem('nebeng_auth', json);
    localStorage.setItem('nebeng_auth', json);
  }, adminData);

  await page.goto('http://localhost:5173/admin/pembayaran', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(outDir, 'superadmin_payment_gateway_active.png'),
    fullPage: false
  });
  console.log('✅ Captured superadmin_payment_gateway_active.png');

  // --- SWITCH TO CUSTOMER & MOBILE VIEW ---
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true }); // Mobile fintech view
  await page.evaluate((auth) => {
    const json = JSON.stringify({
      role: 'customer',
      token: auth.accessToken,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      email: auth.user.email,
      name: auth.user.name,
      user: auth.user,
      loggedInAt: Date.now()
    });
    sessionStorage.setItem('nebeng_auth', json);
    localStorage.setItem('nebeng_auth', json);
  }, customerData);

  await page.goto('http://localhost:5173/customer/tagihan', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Trigger modal
  const payButtons = await page.$$('button');
  for (const btn of payButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Bayar Sekarang')) {
      await btn.click();
      console.log('Clicked Bayar Sekarang button');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2500));

  // SCREENSHOT 2: Checkout Modal - QRIS & E-Wallet (Matches user uploaded image)
  await page.screenshot({
    path: path.join(outDir, 'gateway_checkout_qris_ewallet.png'),
    fullPage: false
  });
  console.log('✅ Captured gateway_checkout_qris_ewallet.png');

  // Switch to Virtual Account tab inside modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Virtual Account'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({
    path: path.join(outDir, 'gateway_checkout_virtual_account.png'),
    fullPage: false
  });
  console.log('✅ Captured gateway_checkout_virtual_account.png');

  // Switch back to QRIS & E-Wallet tab and click QRIS row to see detail
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('QRIS & E-Wallet'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const qrisBtn = document.querySelector('button[data-channel="qris"]');
    if (qrisBtn) qrisBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({
    path: path.join(outDir, 'gateway_checkout_qris_detail.png'),
    fullPage: false
  });
  console.log('✅ Captured gateway_checkout_qris_detail.png');

  await browser.close();
  console.log('All gateway proof screenshots successfully captured!');
}

main().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
