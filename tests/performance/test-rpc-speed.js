const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRpc() {
  console.log('Testing supabase.rpc("get_admin_dashboard_stats"):');
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
    const t1 = performance.now();
    console.log(`RPC Run ${i + 1}: ${Math.round(t1 - t0)}ms`, data, error ? error.message : '');
  }
}

testRpc().catch(console.error);
