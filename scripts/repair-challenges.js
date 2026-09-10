const { createClient } = require('@supabase/supabase-js');

const url = 'https://jwkmwvtvhyptfagdwcus.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3a213dnR2aHlwdGZhZ2R3Y3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3OTgwOSwiZXhwIjoyMTA0NDU1ODA5fQ.tMNS66aiRewwICqB7HYrTy9mcJ0SOXZLwQKZEOOWuw4';
const client = createClient(url, key);

function computePoints(basePoints, minimumPoints, solvesCount, decayThreshold = 30) {
  if (solvesCount <= 1) return basePoints;
  if (basePoints <= minimumPoints) return minimumPoints;
  const ratio = Math.min(1, Math.max(0, (solvesCount - 1) / Math.max(1, decayThreshold - 1)));
  const points = Math.round(basePoints - (basePoints - minimumPoints) * Math.sqrt(ratio));
  return Math.max(minimumPoints, points);
}

async function run() {
  const { data: challenges, error } = await client
    .from('challenges')
    .select('id, name, slug, base_points, current_points, minimum_points, first_blood_bonus, solves_count');

  if (error) {
    console.error('Error fetching challenges:', error);
    return;
  }

  console.log('AUDITING CHALLENGES DATA...');
  const updates = [];

  for (const c of challenges) {
    const expectedCurrent = computePoints(c.base_points, c.minimum_points, c.solves_count);
    if (c.current_points !== expectedCurrent) {
      console.log(`MISMATCH FOUND: "${c.name}" [id: ${c.id}] - base: ${c.base_points}, minimum: ${c.minimum_points}, solves: ${c.solves_count}, current: ${c.current_points} -> fixing to expected: ${expectedCurrent}`);
      updates.push({ id: c.id, name: c.name, current_points: expectedCurrent });
    } else {
      console.log(`OK: "${c.name}" - base: ${c.base_points}, current: ${c.current_points}`);
    }
  }

  console.log(`\nTOTAL MISMATCHES TO FIX: ${updates.length}`);

  for (const u of updates) {
    const { error: updateErr } = await client
      .from('challenges')
      .update({ current_points: u.current_points, updated_at: new Date().toISOString() })
      .eq('id', u.id);
    if (updateErr) {
      console.error(`Failed to update ${u.name}:`, updateErr);
    } else {
      console.log(`SUCCESSFULLY REPAIRED: ${u.name} -> current_points = ${u.current_points}`);
    }
  }

  // Re-fetch to verify
  const { data: verified } = await client
    .from('challenges')
    .select('id, name, slug, base_points, current_points, minimum_points, solves_count');
  console.log('\nFINAL REPAIRED DATABASE INVENTORY:');
  console.table(verified);
}

run();
