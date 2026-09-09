import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postgres';

async function runMigrations() {
  console.log('----------------------------------------------------');
  console.log(' Cyber Crew CTF - Supabase Migration Engine');
  console.log('----------------------------------------------------');

  const migrationsDir = path.resolve(
    process.cwd(),
    'infrastructure/supabase/migrations',
  );

  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Located ${files.length} SQL migration scripts.`);

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully.');

    // Ensure migrations ledger exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const version = file;

      // Check if already applied
      const { rows } = await client.query(
        'SELECT version FROM _schema_migrations WHERE version = $1',
        [version],
      );

      if (rows.length > 0) {
        console.log(`[SKIP] Migration already applied: ${file}`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _schema_migrations (version) VALUES ($1)',
          [version],
        );
        await client.query('COMMIT');
        console.log(`[SUCCESS] Migration applied: ${file}`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[FAILED] Migration ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log('All migrations processed successfully.');
  } catch (err: any) {
    console.warn(
      'Note: If running without a live PostgreSQL instance, SQL scripts in infrastructure/supabase/migrations/ are ready for direct upload into Supabase Dashboard SQL Editor.',
    );
    console.error('Migration execution status:', err.message);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignored
    }
  }
}

runMigrations();
