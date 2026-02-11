import supabase from '../src/config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
    console.log('--- Inspecting Monthly Billing ---');
    const { data, error } = await supabase
        .from('monthly_billing')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Keys:', Object.keys(data[0]).join(', '));
    } else {
        console.log('No records found to inspect.');
    }

    console.log('\n--- Environment ---');
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
}

inspect();
