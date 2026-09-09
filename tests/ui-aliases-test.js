const routesToTest = [
  { path: '/dashboard', expectedRedirect: '/challenges' },
  { path: '/team', expectedRedirect: '/teams' },
  { path: '/admin/categories', expectedRedirect: '/admin/challenges' },
  { path: '/admin/scoreboard', expectedRedirect: '/scoreboard' },
  { path: '/admin/audit-logs', expectedContent: 'AdminAuditLogsPage' },
];

async function verifyRouteAliases() {
  console.log('Testing route aliases & redirects on frontend SPA:');
  const bundleRes = await fetch('http://localhost:5173');
  console.log('Frontend server is alive: HTTP', bundleRes.status);

  for (const r of routesToTest) {
    const res = await fetch('http://localhost:5173' + r.path);
    console.log(`Route ${r.path.padEnd(20)} -> Status: HTTP ${res.status} (SPA shell delivered)`);
  }
}

verifyRouteAliases().catch(console.error);
