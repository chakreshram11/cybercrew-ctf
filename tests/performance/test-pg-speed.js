const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const directHostUrl = 'postgresql://postgres:Chakresh%40152852@db.jwkmwvtvhyptfagdwcus.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: directHostUrl,
  ssl: { rejectUnauthorized: false },
});

async function testQuery() {
  console.log('Testing direct PostgreSQL connection to db.jwkmwvtvhyptfagdwcus.supabase.co:5432:');
  const sql = `
    SELECT
      (SELECT count(*)::int FROM users WHERE role = 'PARTICIPANT') as participants_count,
      (SELECT count(*)::int FROM teams) as teams_count,
      (SELECT count(*)::int FROM challenges) as challenges_count,
      (SELECT count(*)::int FROM challenges WHERE status = 'ACTIVE')::int as active_challenges_count,
      (SELECT count(*)::int FROM submissions) as submissions_count,
      (SELECT count(*)::int FROM solves) as solves_count,
      (SELECT count(*)::int FROM hint_unlocks) as hints_unlocked_count,
      COALESCE((SELECT sum(cost)::int FROM hint_unlocks), 0) as points_deducted_hints;
  `;

  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const { rows } = await pool.query(sql);
    const t1 = performance.now();
    console.log(`Run ${i + 1}: ${Math.round(t1 - t0)}ms`, rows[0]);
  }
  await pool.end();
}

testQuery().catch(console.error);
