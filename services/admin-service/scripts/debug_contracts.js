
import supabase from '../src/config/supabase.js';

async function checkContracts() {
    console.log('Checking contracts table...');
    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching contracts:', error);
    } else {
        console.log('Contracts table exists. Rows:', data.length);
        if (data.length > 0) {
            console.log('Sample:', data[0]);
        }
    }
}

checkContracts();
