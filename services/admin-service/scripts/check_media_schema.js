
import supabase from '../src/config/supabase.js';

async function checkMediaTable() {
    console.log('--- Checking media_investment ---');
    // Fetch one row to see structure
    const { data, error } = await supabase.from('media_investment').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Sample Row:', data);
}

checkMediaTable();
