
import supabase from '../src/config/supabase.js';

async function checkBillingTotals() {
    console.log('--- CHECKING BILLING TOTALS FOR 2026 ---');

    // Fetch all monthly_billing records for 2026
    const { data: billings, error } = await supabase
        .from('monthly_billing')
        .select('*')
        .eq('fiscal_year', 2026)
        .order('fiscal_month');

    if (error) {
        console.error('Error fetching billing data:', error);
        return;
    }

    // Aggregate by month
    const monthlyData = {};
    let totalImmedia = 0;
    let totalImcontent = 0;

    billings.forEach(record => {
        const month = record.fiscal_month;
        if (!monthlyData[month]) {
            monthlyData[month] = { immedia: 0, imcontent: 0 };
        }

        // Add to monthly totals
        const immedia = Number(record.immedia_total || 0);
        const imcontent = Number(record.imcontent_total || 0);

        monthlyData[month].immedia += immedia;
        monthlyData[month].imcontent += imcontent;

        // Add to grand totals
        totalImmedia += immedia;
        totalImcontent += imcontent;
    });

    // Display Results
    console.log('\n--- MONTHLY BREAKDOWN ---');
    console.log('Month\t\tImmedia\t\tImcontent');
    console.log('------------------------------------------------');

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let i = 1; i <= 12; i++) {
        const data = monthlyData[i] || { immedia: 0, imcontent: 0 };
        const monthName = monthNames[i - 1].padEnd(10);
        console.log(`${monthName}\t${data.immedia.toFixed(2)}\t\t${data.imcontent.toFixed(2)}`);
    }

    console.log('------------------------------------------------');
    console.log(`TOTAL Year\t${totalImmedia.toFixed(2)}\t\t${totalImcontent.toFixed(2)}`);
    console.log('------------------------------------------------');

    // Optional: Check specific clients if needed
    // ...
}

checkBillingTotals();
