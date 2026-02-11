
import supabase from '../src/config/supabase.js';

async function checkSchema() {
    const { data, error } = await supabase.from('monthly_billing').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No data or error', error);
    }
}
checkSchema();
