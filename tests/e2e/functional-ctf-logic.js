const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API = 'http://localhost:4000/api/v1';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
    failures.push(message);
  }
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint === '/health'
      ? 'http://localhost:4000/health'
      : `${API}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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

async function runAllTests() {
  console.log('================================================================');
  console.log(' CYBER CREW CTF — PROFESSIONAL FUNCTIONAL & CTF LOGIC TEST SUITE');
  console.log('================================================================');

  const ts = Date.now();
  const testAdminEmail = 'chakreshram11@gmail.com';
  const testAdminPass = 'Chakreshram@152852';

  const userAEmail = `operative_a_${ts}@test.cybercrew.online`;
  const userAPass = 'OperativePass123!';
  const userAUsername = `op_a_${ts.toString().slice(-6)}`;

  const userBEmail = `operative_b_${ts}@test.cybercrew.online`;
  const userBPass = 'OperativePass123!';
  const userBUsername = `op_b_${ts.toString().slice(-6)}`;

  const userCEmail = `operative_c_${ts}@test.cybercrew.online`;
  const userCPass = 'OperativePass123!';
  const userCUsername = `op_c_${ts.toString().slice(-6)}`;

  // ---------------------------------------------------------------------------
  // 1. HEALTH PROBE CHECK
  // ---------------------------------------------------------------------------
  console.log('\n--- MODULE 1: System Telemetry & Health Probe ---');
  const healthRes = await request('/health');
  assert(healthRes.status === 200, 'Health endpoint responds with HTTP 200');
  assert(healthRes.data?.data?.status === 'operational', 'Platform status is operational');

  // ---------------------------------------------------------------------------
  // 2. REGISTRATION & AUTHENTICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- MODULE 2: Registration & Authentication ---');
  // Register User A
  const regARes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: userAUsername,
      email: userAEmail,
      password: userAPass,
    }),
  });
  assert(regARes.status === 201, `Register User A (${userAUsername}) returns HTTP 201`);
  assert(regARes.data?.data?.user?.username === userAUsername, 'User A profile created in database');

  // Register User B
  const regBRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: userBUsername,
      email: userBEmail,
      password: userBPass,
    }),
  });
  assert(regBRes.status === 201, `Register User B (${userBUsername}) returns HTTP 201`);

  // Register User C
  const regCRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: userCUsername,
      email: userCEmail,
      password: userCPass,
    }),
  });
  assert(regCRes.status === 201, `Register User C (${userCUsername}) returns HTTP 201`);

  // Attempt duplicate username
  const dupUserRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: userAUsername,
      email: `diff_${ts}@test.cybercrew.online`,
      password: 'SomePass123!',
    }),
  });
  assert(dupUserRes.status === 409, 'Duplicate username registration rejected with HTTP 409 Conflict');

  // Attempt duplicate email
  const dupEmailRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: `unique_${ts}`,
      email: userAEmail,
      password: 'SomePass123!',
    }),
  });
  assert(dupEmailRes.status === 409, 'Duplicate email registration rejected with HTTP 409 Conflict');

  // Login User A
  const loginARes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userAEmail, password: userAPass }),
  });
  assert(loginARes.status === 200, 'User A login returns HTTP 200');
  assert(!!loginARes.data?.data?.access_token, 'User A received valid JWT session token');
  const tokenA = loginARes.data?.data?.access_token;

  // Login User B
  const loginBRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userBEmail, password: userBPass }),
  });
  const tokenB = loginBRes.data?.data?.access_token;
  assert(!!tokenB, 'User B received valid JWT session token');

  // Login User C
  const loginCRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userCEmail, password: userCPass }),
  });
  const tokenC = loginCRes.data?.data?.access_token;

  // Login Super Admin
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testAdminEmail, password: testAdminPass }),
  });
  assert(adminLoginRes.status === 200, 'Super Admin login returns HTTP 200');
  const adminToken = adminLoginRes.data?.data?.access_token;

  // ---------------------------------------------------------------------------
  // 3. TEAM CREATION, JOINING, ROSTER ENFORCEMENT & TRANSFERS
  // ---------------------------------------------------------------------------
  console.log('\n--- MODULE 3: Team Lifecycle & Squad Operations ---');
  // User A creates Team "CyberPioneers"
  const teamNameA = `Pioneers_${ts.toString().slice(-4)}`;
  const createTeamRes = await request('/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: teamNameA }),
  });
  assert(createTeamRes.status === 201, `User A creates squad [${teamNameA}] (HTTP 201)`);
  const teamA = createTeamRes.data?.data;
  assert(!!teamA?.invite_code, 'Squad assigned high-entropy invite code');
  assert(teamA?.score === 0, 'Initial squad score balance is 0');

  // User A attempts to create a second team (should fail with conflict)
  const secondTeamRes = await request('/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: `Another_${ts}` }),
  });
  assert(secondTeamRes.status === 409, 'Enlisted operative creating second squad rejected with HTTP 409');

  // User B joins Team A via invite code
  const joinTeamRes = await request('/teams/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ invite_code: teamA.invite_code }),
  });
  assert(joinTeamRes.status === 201, 'User B joins squad via invite code (HTTP 201)');

  // Verify Team A dossier now has 2 members
  const teamDossierRes = await request(`/teams/${teamA.slug}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(teamDossierRes.data?.data?.members?.length === 2, 'Squad roster correctly shows 2 operatives');

  // Rotate invite code (Captain only)
  const rotateCodeRes = await request(`/teams/${teamA.id}/regenerate-code`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(rotateCodeRes.status === 201 || rotateCodeRes.status === 200, 'Captain rotates squad invitation code');
  const newCode = rotateCodeRes.data?.data?.invite_code;
  assert(newCode !== teamA.invite_code, 'New invitation code differs from prior code');

  // Old invite code rejected
  const oldCodeJoinRes = await request('/teams/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({ invite_code: teamA.invite_code }),
  });
  assert(oldCodeJoinRes.status === 404, 'Obsolete invitation code rejected with HTTP 404');

  // User C establishes competing squad "GhostRecon"
  const teamNameC = `Ghost_${ts.toString().slice(-4)}`;
  const createTeamCRes = await request('/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({ name: teamNameC }),
  });
  assert(createTeamCRes.status === 201, `User C creates competing squad [${teamNameC}]`);
  const teamC = createTeamCRes.data?.data;

  // ---------------------------------------------------------------------------
  // 4. ADMIN CHALLENGE LIFECYCLE (Create, Hints, Target, Clone, Update)
  // ---------------------------------------------------------------------------
  console.log('\n--- MODULE 4: Admin Challenge Engine & Lifecycle ---');
  // Get Web category
  const categoriesRes = await request('/categories');
  const webCat = categoriesRes.data?.data?.find((c) => c.slug === 'web') || categoriesRes.data?.data?.[0];

  // Admin creates new challenge
  const chalSlug = `qa-test-vuln-${ts}`;
  const chalFlag = `CCCTF{qa_verified_exploit_${ts}}`;
  const createChalRes = await request('/admin/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `QA Sandbox Challenge ${ts.toString().slice(-4)}`,
      slug: chalSlug,
      category_id: webCat.id,
      difficulty: 'MEDIUM',
      challenge_type: 'WEB',
      description: 'Find the hidden flag in the test vault environment.',
      base_points: 500,
      minimum_points: 150,
      first_blood_bonus: 50,
      flag: chalFlag,
      status: 'ACTIVE',
      target_url: 'https://web-test.ctf.cybercrew.online',
    }),
  });
  assert(createChalRes.status === 201, 'Admin creates challenge scenario (HTTP 201)');
  const challenge = createChalRes.data?.data;
  assert(!!challenge?.id, 'Challenge generated valid UUID');

  // Add Hints with positive costs
  const hint1Res = await request(`/admin/challenges/${challenge.id}/hints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Reconnaissance Hint',
      content: 'Inspect the robots.txt file for hidden endpoints.',
      cost: 30,
      display_order: 1,
    }),
  });
  assert(hint1Res.status === 201, 'Admin attaches Hint 1 (Cost: 30 PTS)');
  const hint1 = hint1Res.data?.data;

  const hint2Res = await request(`/admin/challenges/${challenge.id}/hints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Deep Exploit Hint',
      content: 'The endpoint is vulnerable to SQL injection.',
      cost: 100,
      display_order: 2,
    }),
  });
  assert(hint2Res.status === 201, 'Admin attaches Hint 2 (Cost: 100 PTS)');
  const hint2 = hint2Res.data?.data;

  // Verify public challenge listing does NOT expose flag or flag_hash
  const publicChalRes = await request(`/challenges/${chalSlug}`);
  assert(publicChalRes.status === 200, 'Public participant can view challenge scenario');
  const publicChalData = publicChalRes.data?.data;
  assert(!JSON.stringify(publicChalData).includes(chalFlag), 'FLAG SECRECY: Plaintext flag is NOT exposed in response');
  assert(!JSON.stringify(publicChalData).includes('flag_hash'), 'FLAG SECRECY: Flag hash is NOT exposed in response');
  assert(
    publicChalData?.hints?.[0]?.content === undefined,
    'HINT PRIVACY: Locked hint content is masked (undefined) for competitor',
  );

  // ---------------------------------------------------------------------------
  // 5. HINT UNLOCKING & NON-NEGATIVE SCORE ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log('\n--- MODULE 5: Hint System & Non-Negative Score Integrity ---');
  // Team A currently has 0 points.
  // When allow_negative_scores = false (default), unlocking a 30 pt hint must fail with HTTP 400.
  const brokeUnlockRes = await request(`/challenges/${challenge.id}/hints/${hint1.id}/unlock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(
    brokeUnlockRes.status === 400,
    'Unlocking hint with insufficient points rejected with HTTP 400 (Negative score disallowed)',
  );

  // Temporarily adjust Team A's score by +150 points via Admin score arbitration to test hint deductions
  const adjustRes = await request(`/admin/teams/${teamA.id}/adjust-score`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      points: 150,
      reason: 'QA Audit temporary credit for hint deduction testing',
    }),
  });
  assert(adjustRes.status === 201 || adjustRes.status === 200, 'Admin successfully arbitrates team score (+150 PTS)');

  // Now Team A has 150 points. Unlock Hint 1 (Cost: 30)
  const validUnlockRes = await request(`/challenges/${challenge.id}/hints/${hint1.id}/unlock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(validUnlockRes.status === 201 || validUnlockRes.status === 200, 'Hint 1 unlocked successfully');
  assert(validUnlockRes.data?.data?.content === 'Inspect the robots.txt file for hidden endpoints.', 'Revealed hint content matches');

  // Verify Team A score decreased from 150 to 120
  const teamCheckA = await request(`/teams/${teamA.slug}`);
  assert(teamCheckA.data?.data?.score === 120, 'Squad balance decreased by exactly 30 PTS (150 -> 120)');

  // Duplicate unlock by User B (same team): Must NOT charge again (Never charge twice)
  const dupUnlockRes = await request(`/challenges/${challenge.id}/hints/${hint1.id}/unlock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(dupUnlockRes.data?.data?.already_unlocked === true, 'Duplicate unlock by teammate detected (already_unlocked: true)');
  assert(dupUnlockRes.data?.data?.cost === 0, 'Duplicate unlock charges 0 points');

  const teamCheckA2 = await request(`/teams/${teamA.slug}`);
  assert(teamCheckA2.data?.data?.score === 120, 'Squad balance remained at 120 PTS (Zero double-charging)');

  // ---------------------------------------------------------------------------
  // 6. FLAG SUBMISSION, SCORING, FIRST BLOOD & DYNAMIC DECAY
  // ---------------------------------------------------------------------------
  console.log('\n--- MODULE 6: Flag Validation, Solves, First Blood & Score Ledger ---');
  // Submit incorrect flag
  const wrongSubmitRes = await request(`/challenges/${challenge.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ flag: 'CCCTF{wrong_flag_guess}' }),
  });
  assert(wrongSubmitRes.data?.data?.is_correct === false, 'Incorrect flag is rejected (is_correct: false)');
  assert(wrongSubmitRes.data?.data?.points_awarded === 0, 'Zero points awarded on incorrect flag');

  // Submit CORRECT flag by Team A
  const correctSubmitARes = await request(`/challenges/${challenge.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ flag: chalFlag }),
  });
  assert(correctSubmitARes.data?.data?.is_correct === true, 'Correct flag accepted by platform');
  assert(correctSubmitARes.data?.data?.is_first_blood === true, 'First Blood awarded to pioneer squad (#1 solver)');
  assert(
    correctSubmitARes.data?.data?.points_awarded === 550,
    'Points awarded equals 550 PTS (500 Base + 50 First Blood)',
  );

  // Verify Team A score: 120 + 550 = 670 PTS
  const teamCheckA3 = await request(`/teams/${teamA.slug}`);
  assert(teamCheckA3.data?.data?.score === 670, 'Team A score accurately reflects ledger transactions (670 PTS)');

  // Attempt duplicate solve by User B (same team): Must be rejected
  const dupSolveRes = await request(`/challenges/${challenge.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ flag: chalFlag }),
  });
  assert(dupSolveRes.data?.data?.already_solved === true, 'Duplicate solve prevented for squad (already_solved: true)');

  // Second Squad (Team C) solves the same challenge
  // Must NOT receive First Blood, and dynamic scoring should apply or compute
  const correctSubmitCRes = await request(`/challenges/${challenge.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({ flag: chalFlag }),
  });
  assert(correctSubmitCRes.data?.data?.is_correct === true, 'Team C correct solve accepted');
  assert(correctSubmitCRes.data?.data?.is_first_blood === false, 'Team C does NOT receive First Blood (Already claimed)');

  // Verify Scoreboard rankings
  const scoreboardRes = await request('/scoreboard');
  assert(scoreboardRes.status === 200, 'Scoreboard responds with HTTP 200');
  const board = scoreboardRes.data?.data;
  const boardTeamA = board.find((t) => t.team_id === teamA.id);
  const boardTeamC = board.find((t) => t.team_id === teamC.id);

  assert(!!boardTeamA, 'Team A appears on official leaderboard');
  assert(boardTeamA?.first_bloods_count >= 1, 'Team A displays First Blood milestone count');
  assert(boardTeamA?.score === 670, 'Leaderboard score matches score ledger exactly');
  assert(boardTeamA?.rank < boardTeamC?.rank, 'Leaderboard ranks higher-scoring Team A above Team C');

  // Verify Score Ledger history
  const ledgerRes = await request(`/teams/${teamA.slug}/score-history`);
  assert(ledgerRes.data?.data?.length >= 3, 'Team A score ledger contains complete audit trail (Solve, FB, Hint, Adj)');
  const eventTypes = ledgerRes.data?.data?.map((e) => e.event_type);
  assert(eventTypes.includes('CHALLENGE_SOLVE'), 'Ledger contains CHALLENGE_SOLVE event');
  assert(eventTypes.includes('FIRST_BLOOD'), 'Ledger contains FIRST_BLOOD event');
  assert(eventTypes.includes('HINT_PURCHASE'), 'Ledger contains HINT_PURCHASE event');
  assert(eventTypes.includes('ADMIN_ADJUSTMENT'), 'Ledger contains ADMIN_ADJUSTMENT event');

  // ---------------------------------------------------------------------------
  // 7. CLEANUP TEST CHALLENGE
  // ---------------------------------------------------------------------------
  console.log('\n--- MODULE 7: Test Scenario Teardown ---');
  const deleteChalRes = await request(`/admin/challenges/${challenge.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(deleteChalRes.status === 200, 'Admin permanently deletes test challenge scenario');

  console.log('\n================================================================');
  console.log(` RESULTS: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failures)`);
  console.log('================================================================');

  if (failures.length > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
