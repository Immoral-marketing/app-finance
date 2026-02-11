import supabase from '../src/config/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log('Running fee_config migration...\n');

    const migrationPath = path.join(__dirname, '../../../database/migrations/add_fee_config.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('\n⚠️  Please run this SQL in your Supabase SQL Editor');
    console.log('   URL: https://supabase.com/dashboard/project/_/sql');
    console.log('\nAfter running, verify with:');
    console.log('   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'clients\' AND column_name = \'fee_config\';');
}

runMigration().catch(console.error);
