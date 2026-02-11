
import supabase from '../src/config/supabase.js';

async function verifyRepair() {
    console.log('--- VERIFYING MONTHLY BILLING TOTALS ---');
    const { data } = await supabase
        .from('monthly_billing')
        .select('fiscal_month, immedia_total, imcontent_total, fee_paid')
        .eq('fiscal_year', 2026)
        .gt('grand_total', 0); // Only get rows with data

    if (data && data.length > 0) {
        console.log('Found rows with data:', data);
    } else {
        console.log('ALL ROWS ARE ZERO.');
    }
}
verifyRepair();
