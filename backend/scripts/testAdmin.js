process.env.PORT = 5055;
const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Initializing Cendric Server for Admin RBAC Tests on Port 5055 ---');
  require('../server');

  // Allow server and DB connection to establish
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n[TEST 1] Checking /api/health...');
  const health = await request({ hostname: 'localhost', port: 5055, path: '/api/health', method: 'GET' });
  console.log('Status:', health.status, 'Data:', health.data);
  if (health.status !== 200) throw new Error('Health check failed');

  console.log('\n[TEST 2] Registering standard non-admin user...');
  const regEmail = `standard_${Date.now()}@example.com`;
  const regRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    fullName: 'Standard Test User',
    email: regEmail,
    password: 'password123'
  });
  console.log('Status:', regRes.status, 'isAdmin:', regRes.data.user?.isAdmin);
  const stdToken = regRes.data.token;
  const stdUserId = regRes.data.user?._id;

  console.log('\n[TEST 3] RBAC Verification: Standard user accessing /api/admin/overview (Should be 403 Forbidden)...');
  const forbiddenRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: '/api/admin/overview',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${stdToken}` }
  });
  console.log('Status:', forbiddenRes.status, 'Message:', forbiddenRes.data.message);
  if (forbiddenRes.status !== 403) throw new Error('Expected 403 Forbidden for non-admin');

  console.log('\n[TEST 4] Logging in as seeded Administrator (piratheep@example.com)...');
  const adminLoginRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'piratheep@example.com',
    password: 'password123'
  });
  console.log('Status:', adminLoginRes.status, 'User:', adminLoginRes.data.user?.fullName, 'isAdmin:', adminLoginRes.data.user?.isAdmin);
  if (!adminLoginRes.data.user?.isAdmin) throw new Error('Expected piratheep@example.com to have isAdmin: true');
  const adminToken = adminLoginRes.data.token;
  const adminUserId = adminLoginRes.data.user?._id;

  console.log('\n[TEST 5] Administrator accessing /api/admin/overview...');
  const overviewRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: '/api/admin/overview',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Status:', overviewRes.status);
  console.log('User counts:', overviewRes.data.users);
  console.log('Financial metrics:', overviewRes.data.finances);
  console.log('AI Observability:', overviewRes.data.ai);
  console.log('System:', overviewRes.data.system);
  if (overviewRes.status !== 200 || !overviewRes.data.success) throw new Error('Failed to get admin overview');

  console.log('\n[TEST 6] Administrator accessing /api/admin/users list...');
  const usersRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Status:', usersRes.status, 'Total users retrieved:', usersRes.data.count);
  if (usersRes.status !== 200 || !Array.isArray(usersRes.data.users)) throw new Error('Failed to get users list');

  console.log('\n[TEST 7] Self-Protection: Admin trying to deactivate own account (Should be 400)...');
  const selfDeactivateRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: `/api/admin/users/${adminUserId}/toggle-status`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Status:', selfDeactivateRes.status, 'Message:', selfDeactivateRes.data.message);
  if (selfDeactivateRes.status !== 400) throw new Error('Self-deactivation should be blocked');

  console.log('\n[TEST 8] Toggling standard user active status (deactivating)...');
  const toggleStatusRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: `/api/admin/users/${stdUserId}/toggle-status`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Status:', toggleStatusRes.status, 'New isActive:', toggleStatusRes.data.isActive, 'Message:', toggleStatusRes.data.message);
  if (toggleStatusRes.status !== 200 || toggleStatusRes.data.isActive !== false) throw new Error('Failed to deactivate user');

  console.log('\n[TEST 9] Deactivated user attempting to login (Should be 403 Forbidden)...');
  const blockedLoginRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: regEmail,
    password: 'password123'
  });
  console.log('Status:', blockedLoginRes.status, 'Message:', blockedLoginRes.data.message);
  if (blockedLoginRes.status !== 403) throw new Error('Deactivated user should not be able to log in');

  console.log('\n[TEST 10] Promoting standard user to Administrator...');
  const toggleRoleRes = await request({
    hostname: 'localhost',
    port: 5055,
    path: `/api/admin/users/${stdUserId}/toggle-admin`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Status:', toggleRoleRes.status, 'New isAdmin:', toggleRoleRes.data.isAdmin, 'Message:', toggleRoleRes.data.message);
  if (toggleRoleRes.status !== 200 || toggleRoleRes.data.isAdmin !== true) throw new Error('Failed to promote user');

  console.log('\n=================================================');
  console.log('🎉 ALL 10 ADMIN PANEL & RBAC TESTS PASSED WITH 100% SUCCESS!');
  console.log('=================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
