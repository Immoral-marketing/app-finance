
import supabase from '../src/config/supabase.js';

async function diagnose() {
    const year = 2026;
    const month = 2; // As seen in logs

    console.log(`Diagnosing Billing for ${year}-${month}`);

    const { data: records, error } = await supabase
        .from('monthly_billing')
        .select(`
            id, client_id, 
            total_actual_investment, 
            platform_count, 
            applied_fee_percentage, 
            fee_paid, 
            is_manual_override,
            client:clients(name)
        `)
        .eq('fiscal_year', year)
        .eq('fiscal_month', month);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${records.length} records.`);
    records.forEach(r => {
        console.log(`Client: ${r.client.name}`);
        console.log(`  - Manual Override: ${r.is_manual_override}`);
        console.log(`  - Investment: ${r.total_actual_investment}`);
        console.log(`  - P. Count: ${r.platform_count}`);
        console.log(`  - Fee Pct: ${r.applied_fee_percentage}%`);
        console.log(`  - Fee Paid: ${r.fee_paid}`);
        console.log('---');
    });
}

diagnose();
