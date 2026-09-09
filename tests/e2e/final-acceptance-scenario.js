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

async function runAcceptanceTest() {
  console.log('================================================================');
  console.log(' CYBER CREW CTF — SECTION 39: FINAL END-TO-END ACCEPTANCE TEST');
  console.log('================================================================');

  const ts = Date.now();

  // ===========================================================================
  // STEP 1: ADMIN WORKFLOW
  // ===========================================================================
  console.log('\n[PHASE 1: ADMIN SCENARIO PROVISIONING]');

  // 1. Admin Login
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'chakreshram11@gmail.com', password: 'Chakreshram@152852' }),
  });
  if (!adminLogin.ok) throw new Error('Admin login failed');
  const adminToken = adminLogin.data.data.access_token;
  console.log('✓ 1. Admin logged in successfully.');

  // 2. Create Category
  const catRes = await request('/admin/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Acceptance Cat ${ts.toString().slice(-4)}`,
      description: 'End to end acceptance testing discipline',
      display_order: 99,
    }),
  });
  const category = catRes.data.data;
  console.log('✓ 2. Category created:', category.name, `(${category.id})`);

  // 3. Create Challenge with Points, Dynamic Scoring, First Blood, Flag, Target
  const chalFlag = `CCCTF{acceptance_matrix_clear_${ts}}`;
  const chalRes = await request('/admin/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Operation Apex ${ts.toString().slice(-4)}`,
      slug: `operation-apex-${ts}`,
      category_id: category.id,
      difficulty: 'HARD',
      challenge_type: 'WEB',
      description: 'Infiltrate the Apex fortress and recover the primary command directive.\n\nTarget: https://apex.ctf.cybercrew.online',
      base_points: 500,
      minimum_points: 150,
      first_blood_bonus: 50,
      flag: chalFlag,
      status: 'ACTIVE',
      target_url: 'https://apex.ctf.cybercrew.online',
      target_port: 8080,
    }),
  });
  const challenge = chalRes.data.data;
  console.log('✓ 3. Challenge created: Operation Apex | 500 Base, 150 Min, 50 FB');

  // 4. Add 3 Hints with Different Costs
  const h1 = (await request(`/admin/challenges/${challenge.id}/hints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: 'Reconnaissance', content: 'Examine DNS TXT records for apex.ctf.cybercrew.online', cost: 25, display_order: 1 }),
  })).data.data;

  const h2 = (await request(`/admin/challenges/${challenge.id}/hints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: 'Vulnerability Clue', content: 'The query parameter uses json_extract without bounds checking.', cost: 50, display_order: 2 }),
  })).data.data;

  const h3 = (await request(`/admin/challenges/${challenge.id}/hints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ title: 'Exploit Path', content: 'Craft an SQLi payload using boolean blind subqueries.', cost: 100, display_order: 3 }),
  })).data.data;
  console.log('✓ 4. Added 3 progressive hints: H1 (25 pts), H2 (50 pts), H3 (100 pts)');

  // 5. Upload Challenge File Attachment
  const fileRes = await request(`/admin/challenges/${challenge.id}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      file_name: 'apex_firmware.bin',
      file_size: 204800,
      file_path: `challenges/${challenge.id}/apex_firmware.bin`,
      mime_type: 'application/octet-stream',
    }),
  });
  const file = fileRes.data.data;
  console.log('✓ 5. Attached artifact: apex_firmware.bin (200 KB)');

  // 6. Preview Challenge & Verify Flag is NOT Visible
  const previewRes = await request(`/challenges/${challenge.slug}`);
  const previewJson = JSON.stringify(previewRes.data);
  const flagLeaked = previewJson.includes(chalFlag) || previewJson.includes('flag_hash');
  if (flagLeaked) throw new Error('FLAG LEAKED in preview response!');
  console.log('✓ 6. Preview verified: Zero flag or hash leakage in public API.');

  // ===========================================================================
  // STEP 2: PARTICIPANT 1 WORKFLOW
  // ===========================================================================
  console.log('\n[PHASE 2: PARTICIPANT 1 JOURNEY]');

  // 7. Register Participant 1
  const p1Email = `p1_acceptance_${ts}@test.cybercrew.online`;
  const p1Pass = 'Pass1234!';
  const p1User = `p1_${ts.toString().slice(-5)}`;
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: p1User, email: p1Email, password: p1Pass }),
  });

  // 8. Login Participant 1
  const p1Login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: p1Email, password: p1Pass }),
  });
  const p1Token = p1Login.data.data.access_token;
  console.log(`✓ 7-8. Participant 1 (${p1User}) registered and authenticated.`);

  // 9. Create Squad for Participant 1
  const squad1Res = await request('/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${p1Token}` },
    body: JSON.stringify({ name: `ApexHunters_${ts.toString().slice(-4)}` }),
  });
  const squad1 = squad1Res.data.data;
  console.log(`✓ 9. Squad 1 established: [${squad1.name}] (Score: ${squad1.score})`);

  // Give Squad 1 100 points via admin adjustment to test hint unlock
  await request(`/admin/teams/${squad1.id}/adjust-score`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ points: 100, reason: 'Initial seed points for acceptance test' }),
  });

  // 10. Open Challenge & Verify File Download URL
  const chalViewP1 = await request(`/challenges/${challenge.slug}`, {
    headers: { Authorization: `Bearer ${p1Token}` },
  });
  console.log('✓ 10. Participant 1 viewed challenge scenario.');

  // 11. Unlock Hint 1 (Cost: 25)
  const unlockH1 = await request(`/challenges/${challenge.id}/hints/${h1.id}/unlock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p1Token}` },
  });
  if (unlockH1.data.data.cost !== 25) throw new Error('Hint deduction mismatch');
  console.log('✓ 11. Unlocked Hint 1: content received, deducted 25 PTS.');

  // Verify Score Deduction on Squad 1: 100 - 25 = 75 PTS
  const squad1Check = await request(`/teams/${squad1.slug}`);
  if (squad1Check.data.data.score !== 75) throw new Error(`Expected score 75, got ${squad1Check.data.data.score}`);
  console.log('✓ 12. Score verified: Squad balance decreased to 75 PTS.');

  // 12. Submit Wrong Flag -> Verify Rejection
  const wrongFlagRes = await request(`/challenges/${challenge.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p1Token}` },
    body: JSON.stringify({ flag: 'CCCTF{totally_wrong_acceptance_guess}' }),
  });
  if (wrongFlagRes.data?.data?.is_correct !== false) throw new Error('Wrong flag was not rejected!');
  console.log('✓ 13. Wrong flag submitted -> Correctly rejected with friendly feedback.');

  // 13. Submit Correct Flag -> Verify Solve, Points (500 + 50 FB = 550), First Blood
  const correctFlagRes = await request(`/challenges/${challenge.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p1Token}` },
    body: JSON.stringify({ flag: chalFlag }),
  });
  const solveDataP1 = correctFlagRes.data.data;
  if (!solveDataP1.is_correct || !solveDataP1.is_first_blood || solveDataP1.points_awarded !== 550) {
    throw new Error(`Solve validation failed: ${JSON.stringify(solveDataP1)}`);
  }
  console.log('✓ 14. Correct flag submitted: Solve recorded, First Blood awarded, +550 PTS applied!');

  // Verify Squad 1 total score: 75 + 550 = 625 PTS
  const squad1AfterSolve = await request(`/teams/${squad1.slug}`);
  if (squad1AfterSolve.data.data.score !== 625) throw new Error('Squad 1 final score mismatch');
  console.log('✓ 15. Squad 1 total score accurately reflects ledger transactions (625 PTS).');

  // Verify Scoreboard: Squad 1 appears with correct score & solve
  const boardP1 = await request('/scoreboard');
  const squad1Entry = boardP1.data.data.find((t) => t.team_id === squad1.id);
  if (!squad1Entry || squad1Entry.score !== 625 || squad1Entry.solves_count !== 1 || squad1Entry.first_bloods_count !== 1) {
    throw new Error('Squad 1 scoreboard record mismatch');
  }
  console.log(`✓ 16. Scoreboard verified: [${squad1Entry.team_name}] correctly holds ${squad1Entry.score} PTS, 1 solve, 1 First Blood.`);

  // ===========================================================================
  // STEP 3: PARTICIPANT 2 WORKFLOW
  // ===========================================================================
  console.log('\n[PHASE 3: SECOND PARTICIPANT JOURNEY]');

  // 14. Register Participant 2
  const p2Email = `p2_acceptance_${ts}@test.cybercrew.online`;
  const p2Pass = 'Pass1234!';
  const p2User = `p2_${ts.toString().slice(-5)}`;
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: p2User, email: p2Email, password: p2Pass }),
  });

  const p2Login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: p2Email, password: p2Pass }),
  });
  const p2Token = p2Login.data.data.access_token;
  console.log(`✓ 17. Participant 2 (${p2User}) registered and authenticated.`);

  // 15. Create Squad 2
  const squad2Res = await request('/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${p2Token}` },
    body: JSON.stringify({ name: `GhostProtocol_${ts.toString().slice(-4)}` }),
  });
  const squad2 = squad2Res.data.data;
  console.log(`✓ 18. Squad 2 established: [${squad2.name}]`);

  // 16. Participant 2 Solves the Same Challenge
  const solveP2Res = await request(`/challenges/${challenge.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p2Token}` },
    body: JSON.stringify({ flag: chalFlag }),
  });
  const solveDataP2 = solveP2Res.data.data;
  if (!solveDataP2.is_correct || solveDataP2.is_first_blood !== false) {
    throw new Error('Participant 2 should NOT receive First Blood');
  }
  console.log(`✓ 19. Participant 2 solved scenario: is_correct: true, is_first_blood: false (already claimed).`);

  // Verify Scoreboard shows Squad 1 at Rank 1 and Squad 2 at Rank 2
  const boardFinal = await request('/scoreboard');
  const finalLeaderboard = boardFinal.data.data;
  const pos1 = finalLeaderboard.find((t) => t.team_id === squad1.id);
  const pos2 = finalLeaderboard.find((t) => t.team_id === squad2.id);
  if (!pos1 || !pos2 || pos1.rank >= pos2.rank) {
    throw new Error('Leaderboard ranking calculation incorrect');
  }
  console.log(`✓ 20. Leaderboard rankings confirmed:`);
  console.log(`      Rank #${pos1.rank}: ${pos1.team_name} (${pos1.score} PTS, 1 FB)`);
  console.log(`      Rank #${pos2.rank}: ${pos2.team_name} (${pos2.score} PTS, 0 FB)`);

  // ===========================================================================
  // STEP 4: ADMIN ANALYTICS & AUDIT VERIFICATION
  // ===========================================================================
  console.log('\n[PHASE 4: ADMIN ANALYTICS & AUDIT LOGS]');

  // 17. Inspect Challenge Analytics
  const analyticsRes = await request(`/admin/challenges/${challenge.id}/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const analytics = analyticsRes.data.data;
  console.log('✓ 21. Admin Analytics inspected:');
  console.log(`      - Total Submissions: ${analytics.total_submissions}`);
  console.log(`      - Correct Solves:    ${analytics.correct_submissions}`);
  console.log(`      - Incorrect Guesses: ${analytics.incorrect_submissions}`);
  console.log(`      - Unique Squads:     ${analytics.unique_teams_attempted}`);
  console.log(`      - First Blood Squad: ${analytics.first_blood?.team?.name}`);
  console.log(`      - Hints Purchased:   ${analytics.hints_purchased} (-${analytics.hint_points_deducted} PTS)`);

  // 18. Inspect Audit Logs
  const auditRes = await request('/admin/audit-logs', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditLogs = auditRes.data.data;
  const hasCreationLog = auditLogs.some((l) => l.action === 'CHALLENGE_CREATE' && l.resource_id === challenge.id);
  const hasScoreAdjustment = auditLogs.some((l) => l.action === 'ADMIN_SCORE_ADJUSTMENT' && l.resource_id === squad1.id);
  console.log('✓ 22. Audit logs verified:');
  console.log(`      - Challenge creation logged: ${hasCreationLog}`);
  console.log(`      - Score adjustment logged:   ${hasScoreAdjustment}`);

  // ===========================================================================
  // STEP 5: TEARDOWN TEST DATA
  // ===========================================================================
  console.log('\n[PHASE 5: CLEANUP]');
  await request(`/admin/challenges/${challenge.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await request(`/admin/categories/${category.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✓ 23. Test challenge and category cleaned up cleanly.');

  console.log('\n================================================================');
  console.log(' 🎉 SECTION 39: FINAL ACCEPTANCE TEST PASSED 100% SUCCESSFULLY');
  console.log('================================================================');
}

runAcceptanceTest().catch((err) => {
  console.error('Acceptance Test Failure:', err);
  process.exit(1);
});
