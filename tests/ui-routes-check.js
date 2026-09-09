const routes = [
  '/',
  '/ctf',
  '/challenges',
  '/scoreboard',
  '/teams',
  '/rules',
  '/announcements',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/profile',
  '/admin',
  '/admin/challenges',
  '/admin/users',
  '/admin/teams',
  '/admin/submissions',
  '/admin/hints',
  '/admin/announcements',
  '/admin/settings'
];

async function checkRoutes() {
  console.log('Testing frontend SPA route serving on Vite server (http://localhost:5173):');
  let okCount = 0;
  for (const r of routes) {
    try {
      const res = await fetch('http://localhost:5173' + r);
      const text = await res.text();
      const hasRoot = text.includes('root') || text.includes('Cyber Crew CTF');
      if (res.status === 200 && hasRoot) okCount++;
      console.log(`  Route ${r.padEnd(24)} -> HTTP ${res.status} | HTML Shell: ${hasRoot ? 'OK' : 'MISSING'}`);
    } catch (err) {
      console.log(`  Route ${r.padEnd(24)} -> FAILED (${err.message})`);
    }
  }
  console.log(`\nRoutes verified: ${okCount} / ${routes.length}`);
}

checkRoutes();
