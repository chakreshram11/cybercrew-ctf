import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

async function seedDatabase() {
  console.log('----------------------------------------------------');
  console.log(' Cyber Crew CTF - Supabase Database Verification');
  console.log('----------------------------------------------------');

  if (supabaseUrl.includes('placeholder')) {
    console.log('[INFO] SUPABASE_URL not configured. Migrations 001-004 can be directly run via the Supabase SQL Editor.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Verifying connection to Supabase platform...');
  const { data: settings, error } = await supabase
    .from('competition_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Database query verification error:', error.message);
  } else if (settings) {
    console.log(`[VERIFIED] Competition: ${settings.ctf_name} | State: ${settings.state}`);
  } else {
    console.log('[INFO] Competition settings table empty. Run migration 004_seed_data.sql to initialize.');
  }
}

seedDatabase();
