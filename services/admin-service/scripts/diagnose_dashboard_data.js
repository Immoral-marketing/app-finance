
import supabase from '../src/config/supabase.js';

async function diagnoseDashboardData() {
    console.log('--- DIAGNOSING BILLING DETAILS 2026 ---');

    // 1. Fetch RAW billing_details with nested monthly_billing
    // We fetch everything and filter in JS to avoid join syntax errors in script
    const { data: details, error } = await supabase
        .from('billing_details')
        .select(`
            id,
            amount,
            service_name,
            department_id,
            departments (name, code),
            monthly_billing (fiscal_year, fiscal_month)
        `);

    if (error) {
        console.error('Error fetching details:', error);
        return;
    }

    // Filter for 2026 in JS
    const details2026 = details.filter(d => d.monthly_billing?.fiscal_year === 2026);

    console.log(`Found ${details2026.length} billing_details records for 2026.`);

    // 2. Aggregate by Department to hunt for the mystery ~19k and ~4k
    const deptTotals = {};

    details2026.forEach(d => {
        const deptName = d.departments?.name || 'Unknown';
        const amount = Number(d.amount || 0);
        const month = d.monthly_billing?.fiscal_month;

        if (!deptTotals[deptName]) deptTotals[deptName] = 0;
        deptTotals[deptName] += amount;

        if (amount > 0) {
            console.log(`[${month}/2026] ${deptName.padEnd(15)}: ${amount.toFixed(2)} - ${d.service_name}`);
        }
    });

    console.log('\n--- CALCULATED TOTALS (from billing_details) ---');
    Object.entries(deptTotals).forEach(([name, total]) => {
        console.log(`${name.padEnd(20)}: ${total.toFixed(2)}`);
    });

}

diagnoseDashboardData();
