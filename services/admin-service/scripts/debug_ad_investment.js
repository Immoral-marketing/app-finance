
import supabase from '../src/config/supabase.js';

async function checkAdInvestment() {
    console.log('--- Checking client_ad_investment ---');
    const { data, count, error } = await supabase
        .from('client_ad_investment')
        .select('*', { count: 'exact', head: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Total Rows:', count);
        console.log('Sample Data:', data);
    }
}

checkAdInvestment();
