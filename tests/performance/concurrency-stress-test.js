const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API = 'http://localhost:4000/api/v1';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function request(endpoint, options = {}) {
  const url = `${API}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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

async function runConcurrencyTests() {
  console.log('===============================================================');
  console.log(' CYBER CREW CTF — FIRST BLOOD & HINT CONCURRENCY STRESS TESTS');
  console.log('===============================================================');

  const ts = Date.now();
  const secretFlag = `CCCTF{concurrency_atomic_flag_${ts}}`;

  // 1. Authenticate Admin
  const adminAuth = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'chakreshram11@gmail.com', password: 'Chakreshram@152852' }),
  });
  const adminToken = adminAuth.data?.data?.access_token;
  console.log('✓ Admin authenticated.');

  // 2. Locate or create test category
  const categories = (await request('/categories')).data?.data;
  const catId = categories[0]?.id;

  // 3. Create fresh stress-test challenge
  const chalRes = await request('/admin/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Concurrency Lab ${ts.toString().slice(-4)}`,
      slug: `concurrency-lab-${ts}`,
      category_id: catId,
      difficulty: 'HARD',
      challenge_type: 'CRYPTO',
      description: 'Stress testing scenario for First Blood and Hint atomicity.',
      base_points: 500,
      minimum_points: 100,
      first_blood_bonus: 50,
      flag: secretFlag,
      status: 'ACTIVE',
    }),
  });
  const challenge = chalRes.data?.data;
  console.log(`✓ Created test challenge: ${challenge.name} (${challenge.id})`);

  // ---------------------------------------------------------------------------
  // STEP 1: PROVISION 20 TEST TEAMS AND LOGINS
  // ---------------------------------------------------------------------------
  console.log('\n--- Provisioning 20 Test Competitor Personas ---');
  const teamTokens = [];
  const teamIds = [];

  for (let i = 1; i <= 20; i++) {
    const userEmail = `c_agent_${i}_${ts}@test.cybercrew.online`;
    const userPass = 'StressPass123!';
    const username = `ag_${i}_${ts.toString().slice(-4)}`;

    // Create via auth register
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email: userEmail, password: userPass }),
    });

    // Login
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, password: userPass }),
    });
    const token = loginRes.data?.data?.access_token;

    // Create unique team
    const teamRes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Squad_Stress_${i}_${ts.toString().slice(-4)}` }),
    });
    const team = teamRes.data?.data;

    teamTokens.push(token);
    teamIds.push(team.id);
  }
  console.log(`✓ Successfully provisioned 20 teams and authenticated operatives.`);

  // ---------------------------------------------------------------------------
  // STEP 2: 20 CONCURRENT CORRECT SUBMISSIONS FOR FIRST BLOOD
  // ---------------------------------------------------------------------------
  console.log('\n--- Executing 20 Simultaneous Correct Flag Submissions ---');
  const t0 = Date.now();
  const concurrentSolves = teamTokens.map((token, index) =>
    request(`/challenges/${challenge.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ flag: secretFlag }),
    }),
  );

  const solveResponses = await Promise.all(concurrentSolves);
  const totalDuration = Date.now() - t0;
  console.log(`✓ 20 submissions completed concurrently in ${totalDuration}ms.`);

  const firstBloodResults = solveResponses.filter((r) => r.data?.data?.is_first_blood === true);
  const normalSolveResults = solveResponses.filter((r) => r.data?.data?.is_first_blood === false);
  const correctCount = solveResponses.filter((r) => r.data?.data?.is_correct === true).length;

  console.log(`  - Total Correct Solves:  ${correctCount} / 20`);
  console.log(`  - First Blood Winners:   ${firstBloodResults.length} (Expected: EXACTLY 1)`);
  console.log(`  - Regular Solvers:       ${normalSolveResults.length} (Expected: 19)`);

  if (firstBloodResults.length !== 1) {
    throw new Error(`CRITICAL ATOMICITY FAILURE: Expected exactly 1 First Blood winner, but found ${firstBloodResults.length}!`);
  }

  // Database Verification: Check solves table directly
  const { data: dbSolves, error: solvesErr } = await supabase
    .from('solves')
    .select('*')
    .eq('challenge_id', challenge.id);

  console.log(`✓ Verified database solves table: ${dbSolves.length} total solves recorded.`);
  const dbFirstBloods = dbSolves.filter((s) => s.is_first_blood === true);
  console.log(`✓ Database First Blood count: ${dbFirstBloods.length} (Expected: 1)`);

  if (dbFirstBloods.length !== 1) {
    throw new Error(`DATABASE CORRUPTION: Found ${dbFirstBloods.length} First Blood solves in database!`);
  }

  // ---------------------------------------------------------------------------
  // STEP 3: HINT CONCURRENCY STRESS TEST (20 SIMULTANEOUS UNLOCKS)
  // ---------------------------------------------------------------------------
  console.log('\n--- Executing 20 Simultaneous Hint Unlocks for Same Squad ---');
  // Attach a 50 pt hint to challenge
  const hintRes = await request(`/admin/challenges/${challenge.id}/hints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: 'Stress Hint', content: 'Atomic hint content', cost: 50, display_order: 1 }),
  });
  const hint = hintRes.data?.data;

  // Use Team 1 (which solved the challenge and has points)
  const team1Token = teamTokens[0];
  const team1Id = teamIds[0];

  const { data: team1Before } = await supabase.from('teams').select('score').eq('id', team1Id).single();
  console.log(`  Team 1 balance before concurrent hint unlock: ${team1Before.score} PTS`);

  // Fire 20 simultaneous unlock requests for the SAME team and SAME hint
  const concurrentHints = Array.from({ length: 20 }, () =>
    request(`/challenges/${challenge.id}/hints/${hint.id}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${team1Token}` },
    }),
  );

  const hintResponses = await Promise.all(concurrentHints);
  const chargedUnlocks = hintResponses.filter((r) => r.data?.data?.cost > 0);
  const alreadyUnlocked = hintResponses.filter((r) => r.data?.data?.already_unlocked === true);

  console.log(`  - Successful Deductions: ${chargedUnlocks.length} (Expected: EXACTLY 1)`);
  console.log(`  - Free Teammate Unlocks: ${alreadyUnlocked.length} (Expected: 19)`);

  // Verify database: hint_unlocks table must have exactly 1 record
  const { data: dbUnlocks } = await supabase
    .from('hint_unlocks')
    .select('*')
    .eq('team_id', team1Id)
    .eq('hint_id', hint.id);

  console.log(`✓ Database hint_unlocks count for Team 1: ${dbUnlocks.length} (Expected: 1)`);
  if (dbUnlocks.length !== 1) {
    throw new Error(`CRITICAL HINT CORRUPTION: Found ${dbUnlocks.length} unlocks in database!`);
  }

  // Verify Team 1 score balance: Decreased by exactly 50 points
  const { data: team1After } = await supabase.from('teams').select('score').eq('id', team1Id).single();
  const actualDeduction = team1Before.score - team1After.score;
  console.log(`  Team 1 balance after: ${team1After.score} PTS (Deduction: ${actualDeduction} PTS, Expected: 50)`);

  if (actualDeduction !== 50) {
    throw new Error(`DOUBLE DEDUCTION DETECTED: Deducted ${actualDeduction} PTS instead of 50 PTS!`);
  }

  // ---------------------------------------------------------------------------
  // STEP 4: SCOREBOARD CONSISTENCY (teams.score vs SUM(score_events))
  // ---------------------------------------------------------------------------
  console.log('\n--- Verifying Scoreboard Consistency & Ledger Audit ---');
  let scoreDriftDetected = false;

  for (let i = 0; i < 20; i++) {
    const tid = teamIds[i];
    const { data: teamRec } = await supabase.from('teams').select('name, score').eq('id', tid).single();
    const { data: events } = await supabase.from('score_events').select('points').eq('team_id', tid);
    const ledgerSum = (events || []).reduce((sum, e) => sum + e.points, 0);

    const matches = teamRec.score === ledgerSum;
    if (!matches) {
      console.error(`  [DRIFT] ${teamRec.name}: teams.score=${teamRec.score} vs ledgerSum=${ledgerSum}`);
      scoreDriftDetected = true;
    }
  }

  if (scoreDriftDetected) {
    throw new Error('SCORE DRIFT DETECTED: teams.score does not match SUM(score_events)!');
  } else {
    console.log('✓ ZERO SCORE DRIFT: All 20 teams scores agree 100% with SUM(score_events) ledger!');
  }

  // ---------------------------------------------------------------------------
  // CLEANUP TEST DATA
  // ---------------------------------------------------------------------------
  console.log('\n--- Cleaning Up Concurrency Stress Test Resources ---');
  await request(`/admin/challenges/${challenge.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✓ Test challenge removed cleanly.');

  console.log('===============================================================');
  console.log(' 🎉 ALL CONCURRENCY STRESS TESTS PASSED WITH ZERO CORRUPTION!');
  console.log('===============================================================');
}

runConcurrencyTests().catch((err) => {
  console.error('Concurrency Test Failure:', err);
  process.exit(1);
});
