
import supabase from '../src/config/supabase.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    try {
        const sql = `ALTER TABLE monthly_billing ADD COLUMN IF NOT EXISTS total_actual_investment NUMERIC DEFAULT 0;`;
        console.log('Attempting to run SQL via RPC...');

        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('RPC Failed (Expected if function missing):', error.message);
            // Fallback: We can't do anything else without credentials
        } else {
            console.log('Migration successful via RPC!');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

runMigration();
