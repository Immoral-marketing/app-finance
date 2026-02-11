
import supabase from '../src/config/supabase.js';

async function checkServiceCodes() {
    const { data: details, error } = await supabase
        .from('billing_details')
        .select(`
            amount,
            service_name,
            services (code),
            monthly_billing (fiscal_year)
        `);

    // Filter in JS
    const details2026 = details.filter(d => d.monthly_billing?.fiscal_year === 2026 && d.amount > 0);

    console.log('--- SERVICE CODES FOR 2026 DETAILS ---');
    details2026.forEach(d => {
        console.log(`${d.service_name.padEnd(30)} | Code: ${d.services?.code} | Amount: ${d.amount}`);
    });
}

checkServiceCodes();
