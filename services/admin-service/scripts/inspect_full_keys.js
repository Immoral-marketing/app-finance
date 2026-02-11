import supabase from '../src/config/supabase.js';

async function inspect() {
    console.log('--- Inspecting Monthly Billing Keys ---');
    const { data, error } = await supabase
        .from('monthly_billing')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        const keys = Object.keys(data[0]);
        console.log(`Found ${keys.length} columns:`);
        keys.forEach(k => console.log(k));
    } else {
        console.log('No records found.');
    }
}

inspect();
