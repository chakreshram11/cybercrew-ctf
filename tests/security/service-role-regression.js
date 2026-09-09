const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API = 'http://localhost:4000/api/v1';

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

async function runServiceRoleRegression() {
  console.log('===============================================================');
  console.log(' CYBER CREW CTF — GATE ITEM 6: SUPABASE SERVICE-ROLE REGRESSION');
  console.log('===============================================================');

  const ts = Date.now();

  // 1. Backend initializes service-role client (already initialized on startup)
  console.log('Step 1: Backend service-role client initialized.');

  // 2. Participant 1 authenticates
  console.log('Step 2: Authenticating Participant 1 (chakreshram05@gmail.com)...');
  const login1 = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'chakreshram05@gmail.com', password: 'Chakreshram@152852' }),
  });
  if (!login1.ok) throw new Error('Participant 1 login failed');
  console.log('✓ Participant 1 authenticated successfully. Role:', login1.data.data.user.role);

  // 3. Perform privileged backend operation (e.g. register new user directly into public.users which has RLS requiring service_role)
  console.log('Step 3: Performing privileged backend operation (User Registration via admin API)...');
  const testUser1 = {
    username: `priv_op1_${ts.toString().slice(-4)}`,
    email: `priv_op1_${ts}@test.cybercrew.online`,
    password: 'TestPassword123!',
  };
  const reg1 = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser1),
  });

  // 4. Verify privileged operation still works (service-role did NOT get downgraded to participant 1!)
  console.log('Step 4: Verifying privileged operation succeeded without RLS violation...');
  if (!reg1.ok || !reg1.data.success) {
    throw new Error(`REGRESSION DETECTED: Privileged operation failed after Participant 1 login: ${JSON.stringify(reg1.data)}`);
  }
  console.log('✓ Privileged operation 1 SUCCEEDED! User created in public.users:', reg1.data.data.user.username);

  // 5. Authenticate another participant
  console.log('Step 5: Authenticating Participant 2 (newly registered user)...');
  const login2 = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testUser1.email, password: testUser1.password }),
  });
  if (!login2.ok) throw new Error('Participant 2 login failed');
  console.log('✓ Participant 2 authenticated successfully.');

  // 6. Perform privileged operation again
  console.log('Step 6: Performing privileged operation again after Participant 2 login...');
  const testUser2 = {
    username: `priv_op2_${ts.toString().slice(-4)}`,
    email: `priv_op2_${ts}@test.cybercrew.online`,
    password: 'TestPassword123!',
  };
  const reg2 = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser2),
  });

  if (!reg2.ok || !reg2.data.success) {
    throw new Error(`REGRESSION DETECTED: Privileged operation failed after Participant 2 login: ${JSON.stringify(reg2.data)}`);
  }
  console.log('✓ Privileged operation 2 SUCCEEDED! User created in public.users:', reg2.data.data.user.username);

  // Clean up test users
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from('users').delete().in('email', [testUser1.email, testUser2.email]);
  await supabase.auth.admin.deleteUser(reg1.data.data.user.id);
  await supabase.auth.admin.deleteUser(reg2.data.data.user.id);

  console.log('===============================================================');
  console.log(' ✓ SUPABASE SERVICE-ROLE REGRESSION PASSED: ZERO SESSION POLLUTION');
  console.log('===============================================================');
}

runServiceRoleRegression().catch((err) => {
  console.error('Service Role Regression Failure:', err);
  process.exit(1);
});
