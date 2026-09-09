const fs = require('fs');
const path = require('path');

const patterns = [
  { name: 'BEGIN PRIVATE KEY', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Hardcoded Non-Test Flags', regex: /CCCTF\{(?!development_only_|test_|sample_|example_|acceptance_|qa_|concurrency_|realtime_|caesar_|y0ur_captur3d_|super_classified_security_|consistent_hash|flag_one|flag_two|correct_solution|wrong_guess|rapid_guess)[a-zA-Z0-9_\-]+\}/ },
];

const scanDirs = ['backend/src', 'frontend/src', 'infrastructure', 'challenges'];
const excludeFiles = ['.spec.ts', '.spec.js', '.test.ts', '.test.js'];

console.log('Running Repository-Wide Secret & Unhashed Flag Scan:');
let totalMatches = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && !entry.name.endsWith('.png') && !entry.name.endsWith('.jpg') && !entry.name.endsWith('.ico') && !excludeFiles.some(e => entry.name.endsWith(e))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const p of patterns) {
        if (p.regex.test(content)) {
          console.log(`  [MATCH] ${p.name} in ${fullPath}`);
          totalMatches++;
        }
      }
    }
  }
}

for (const d of scanDirs) {
  scanDir(d);
}

console.log(`\nScan complete. Exposed production secrets/flags in source/infra: ${totalMatches}`);
