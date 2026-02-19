import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from current directory (admin-service)
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

console.log('Environment loaded.');
console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Service Key:', supabaseKey ? 'Found' : 'Missing');
console.log('Database URL:', databaseUrl ? 'Found' : 'Missing');

const sql = `
DO $$
BEGIN
    ALTER TABLE monthly_billing ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN monthly_billing.cell_metadata IS 'Stores cell-specific metadata like comments for header fields (investment, fee_pct, etc). Keyed by field name.';
END $$;
`;

async function run() {
    try {
        if (databaseUrl) {
            console.log('Using direct PG connection...');
            const client = new pg.Client({
                connectionString: databaseUrl,
                ssl: { rejectUnauthorized: false } // Supabase usually requires SSL
            });
            await client.connect();
            await client.query(sql);
            await client.end();
            console.log('Migration successful via PG!');
            return;
        }

        if (supabaseUrl && supabaseKey) {
            console.log('Using Supabase RPC (exec_sql)...');
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error) throw error;
            console.log('Migration successful via RPC!');
            return;
        }

        throw new Error('No valid connection method available (missing DATABASE_URL or credentials/RPC)');

    } catch (err) {
        console.error('Migration failed:', err.message);
        // We will notify the user to run it manually if this fails.
        process.exit(1);
    }
}

run();
