const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const url = 'postgresql://postgres:Chakresh%40152852@db.jwkmwvtvhyptfagdwcus.supabase.co:5432/postgres';
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function apply() {
  const sql = fs.readFileSync(path.resolve(__dirname, '../infrastructure/supabase/migrations/006_first_blood_unique_index.sql'), 'utf8');
  await pool.query(sql);
  console.log('Successfully created partial unique index uq_challenge_first_blood in PostgreSQL!');
  await pool.end();
}

apply().catch(console.error);
