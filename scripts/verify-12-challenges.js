const { createClient } = require('@supabase/supabase-js');

const url = 'https://jwkmwvtvhyptfagdwcus.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3a213dnR2aHlwdGZhZ2R3Y3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg3OTgwOSwiZXhwIjoyMTA0NDU1ODA5fQ.tMNS66aiRewwICqB7HYrTy9mcJ0SOXZLwQKZEOOWuw4';
const client = createClient(url, key);

const targetChallenges = [
  "Echoes of the Hidden Flag",
  "Profiler Secret",
  "Operation Apex 5347",
  "the-forgotten-directory",
  "Hidden in Plain Sight",
  "WHITE FUR",
  "Cookie-Crumbs",
  "Robots Don't Lie",
  "Source Hunter",
  "RSA Rookie",
  "Vigenere Vault",
  "XOR Locked"
];

async function check12() {
  const { data: challenges, error } = await client
    .from('challenges')
    .select('id, name, slug, base_points, current_points, minimum_points, first_blood_bonus, solves_count');

  if (error) {
    console.error(error);
    return;
  }

  console.log('=== SPECIFIC 12 CHALLENGES AUDIT & VERIFICATION REPORT ===\n');

  const report = [];

  for (const name of targetChallenges) {
    const found = challenges.find(c => c.name.toLowerCase() === name.toLowerCase() || c.slug.toLowerCase() === name.toLowerCase());
    if (found) {
      report.push({
        'Challenge Name': found.name,
        'Base Points': found.base_points,
        'Current Points': found.current_points,
        'Min Points': found.minimum_points,
        'First Blood Bonus': found.first_blood_bonus,
        'Solves': found.solves_count,
        'Match?': found.solves_count <= 1 ? (found.base_points === found.current_points ? 'EXACT MATCH' : 'MISMATCH') : 'DYNAMIC DECAY VALID'
      });
    } else {
      report.push({
        'Challenge Name': name,
        'Status': 'Not present in current DB'
      });
    }
  }

  console.table(report);
}

check12();
