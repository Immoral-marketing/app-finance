
import supabase from '../src/config/supabase.js';

async function checkSchema() {
    const { data } = await supabase.from('monthly_billing').select('*').limit(1);
    console.log('Keys:', Object.keys(data?.[0] || {}));
}
checkSchema();
