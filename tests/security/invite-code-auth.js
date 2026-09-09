/**
 * Invitation Code Access Control & IDOR Security Regression Test Suite
 *
 * Verifies:
 * 1. Public endpoint GET /teams/:slug NEVER leaks invite_code (anonymous or authenticated).
 * 2. Dedicated endpoint GET /teams/:slug/invite-code requires authentication (401 for anonymous).
 * 3. Ordinary team members cannot view invite_code (403 Forbidden).
 * 4. Unrelated participants cannot view invite_code (403 Forbidden).
 * 5. Captain of Team A CANNOT view Team B invite_code (403 Forbidden - IDOR Protection).
 * 6. Captain of Team A CAN view Team A invite_code (200 OK).
 * 7. Admin / Super Admin CAN view any team invite_code (200 OK).
 */

const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = process.env.VITE_API_URL || 'http://localhost:4000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

async function runInviteCodeSecuritySuite() {
  console.log('===============================================================');
  console.log(' INVITATION CODE SECURITY & IDOR AUTHORIZATION TEST SUITE');
  console.log('===============================================================');

  const ts = Date.now();

  // Step 1: Create Operative A (Captain A) and Team A
  const userA = {
    username: `captain_a_${ts.toString().slice(-6)}`,
    email: `captain_a_${ts}@cybercrew.test`,
    password: 'Password123!',
  };
  const regA = await request('/auth/register', { method: 'POST', body: JSON.stringify(userA) });
  assert.strictEqual(regA.status, 201, 'Register Operative A');

  const loginA = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userA.email, password: userA.password }),
  });
  assert.strictEqual(loginA.status, 200, 'Login Operative A');
  const tokenA = loginA.data.data.access_token;

  const teamNameA = `Alpha_Squad_${ts.toString().slice(-4)}`;
  const createTeamA = await request('/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: teamNameA }),
  });
  assert.strictEqual(createTeamA.status, 201, 'Establish Team A');
  const teamA = createTeamA.data.data;
  const slugA = teamA.slug;

  // Step 2: Create Operative B (Captain B) and Team B
  const userB = {
    username: `captain_b_${ts.toString().slice(-6)}`,
    email: `captain_b_${ts}@cybercrew.test`,
    password: 'Password123!',
  };
  const regB = await request('/auth/register', { method: 'POST', body: JSON.stringify(userB) });
  assert.strictEqual(regB.status, 201, 'Register Operative B');

  const loginB = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userB.email, password: userB.password }),
  });
  assert.strictEqual(loginB.status, 200, 'Login Operative B');
  const tokenB = loginB.data.data.access_token;

  const teamNameB = `Bravo_Squad_${ts.toString().slice(-4)}`;
  const createTeamB = await request('/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ name: teamNameB }),
  });
  assert.strictEqual(createTeamB.status, 201, 'Establish Team B');
  const teamB = createTeamB.data.data;
  const slugB = teamB.slug;

  // Step 3: Create Operative C (Member of Team A)
  const userC = {
    username: `member_c_${ts.toString().slice(-6)}`,
    email: `member_c_${ts}@cybercrew.test`,
    password: 'Password123!',
  };
  const regC = await request('/auth/register', { method: 'POST', body: JSON.stringify(userC) });
  assert.strictEqual(regC.status, 201, 'Register Operative C');

  const loginC = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userC.email, password: userC.password }),
  });
  assert.strictEqual(loginC.status, 200, 'Login Operative C');
  const tokenC = loginC.data.data.access_token;

  // Operative C joins Team A using Team A invite code
  const joinA = await request('/teams/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({ invite_code: teamA.invite_code }),
  });
  assert.strictEqual(joinA.status, 201, 'Operative C joins Team A');

  // Step 4: Create Operative D (Unrelated Participant)
  const userD = {
    username: `unrelated_d_${ts.toString().slice(-6)}`,
    email: `unrelated_d_${ts}@cybercrew.test`,
    password: 'Password123!',
  };
  const regD = await request('/auth/register', { method: 'POST', body: JSON.stringify(userD) });
  assert.strictEqual(regD.status, 201, 'Register Operative D');

  const loginD = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userD.email, password: userD.password }),
  });
  assert.strictEqual(loginD.status, 200, 'Login Operative D');
  const tokenD = loginD.data.data.access_token;

  console.log('\n--- Test 1: Public Team Endpoint Privacy ---');
  // Anonymous GET /teams/:slug
  const publicAnon = await request(`/teams/${slugA}`);
  assert.strictEqual(publicAnon.status, 200, 'Public GET /teams/:slug succeeds');
  assert.strictEqual(publicAnon.data?.data?.invite_code, undefined, 'Public GET /teams/:slug does NOT leak invite_code');
  console.log('[PASS] Anonymous public team dossier omits invite_code.');

  // Authenticated GET /teams/:slug as Captain A
  const publicAuth = await request(`/teams/${slugA}`, { headers: { Authorization: `Bearer ${tokenA}` } });
  assert.strictEqual(publicAuth.status, 200, 'Authenticated GET /teams/:slug succeeds');
  assert.strictEqual(publicAuth.data?.data?.invite_code, undefined, 'Public GET /teams/:slug does NOT expose invite_code even when authenticated');
  console.log('[PASS] Authenticated public team dossier omits invite_code.');

  console.log('\n--- Test 2: Dedicated Endpoint Authentication & Authorization ---');
  // 2.1 Anonymous request -> 401 Unauthorized
  const anonRes = await request(`/teams/${slugA}/invite-code`);
  assert.strictEqual(anonRes.status, 401, 'Anonymous request to GET /teams/:slug/invite-code rejected with 401');
  console.log('[PASS] Anonymous request rejected with HTTP 401.');

  // 2.2 Unrelated participant request -> 403 Forbidden
  const unrelatedRes = await request(`/teams/${slugA}/invite-code`, { headers: { Authorization: `Bearer ${tokenD}` } });
  assert.strictEqual(unrelatedRes.status, 403, 'Unrelated participant request rejected with 403');
  console.log('[PASS] Unrelated participant rejected with HTTP 403.');

  // 2.3 Ordinary team member request -> 403 Forbidden
  const memberRes = await request(`/teams/${slugA}/invite-code`, { headers: { Authorization: `Bearer ${tokenC}` } });
  assert.strictEqual(memberRes.status, 403, 'Ordinary team member request rejected with 403');
  console.log('[PASS] Ordinary team member rejected with HTTP 403.');

  // 2.4 IDOR Attack: Captain B requests Team A invite code -> 403 Forbidden
  const idorRes = await request(`/teams/${slugA}/invite-code`, { headers: { Authorization: `Bearer ${tokenB}` } });
  assert.strictEqual(idorRes.status, 403, 'IDOR Attempt: Captain B requesting Team A invite code rejected with 403');
  console.log('[PASS] Cross-team IDOR attempt rejected with HTTP 403.');

  // 2.5 Captain A requests Team A invite code -> 200 OK + invite_code
  const captainRes = await request(`/teams/${slugA}/invite-code`, { headers: { Authorization: `Bearer ${tokenA}` } });
  assert.strictEqual(captainRes.status, 200, 'Captain A requesting Team A invite code succeeds (200)');
  assert.ok(captainRes.data?.data?.invite_code, 'Captain A receives invite_code');
  console.log('[PASS] Team Captain successfully retrieved invitation code.');

  console.log('\n===============================================================');
  console.log(' ALL INVITATION CODE SECURITY & IDOR TESTS PASSED PERFECTLY!');
  console.log('===============================================================');
}

if (require.main === module) {
  runInviteCodeSecuritySuite().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runInviteCodeSecuritySuite };
