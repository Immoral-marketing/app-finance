import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function debugMatrixData() {
    console.log('=== DEBUGGING MATRIX DATA FOR P&L ===\n');

    // 1. Get all monthly_billing for 2026
    const { data: billings } = await supabase
        .from('monthly_billing')
        .select(`
            id,
            fiscal_month,
            fiscal_year,
            fee_paid,
            client:clients(name, vertical:verticals(name))
        `)
        .eq('fiscal_year', 2026)
        .order('fiscal_month');

    console.log('=== MONTHLY BILLING RECORDS (2026) ===');
    console.log('Total records:', billings?.length);

    // Group by month
    const byMonth = {};
    billings?.forEach(b => {
        const month = b.fiscal_month;
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(b);
    });

    Object.keys(byMonth).sort((a, b) => a - b).forEach(month => {
        console.log(`\n--- MES ${month} ---`);
        let totalFeePaid = 0;
        let imfilmsTotal = 0;

        byMonth[month].forEach(b => {
            const feePaid = Number(b.fee_paid || 0);
            const vertical = b.client?.vertical?.name || 'Sin vertical';
            const clientName = b.client?.name || 'Unknown';

            if (feePaid > 0) {
                console.log(`  ${clientName}: fee_paid=${feePaid} (${vertical})`);
                totalFeePaid += feePaid;
                if (vertical.toLowerCase() === 'imfilms') {
                    imfilmsTotal += feePaid;
                }
            }
        });

        console.log(`  TOTAL fee_paid mes ${month}: ${totalFeePaid}`);
        console.log(`  TOTAL Imfilms mes ${month}: ${imfilmsTotal}`);
        console.log(`  PAID GENERAL mes ${month}: ${totalFeePaid - imfilmsTotal}`);
    });

    // 2. Get billing_details aggregated by service and month
    console.log('\n\n=== BILLING DETAILS BY SERVICE ===');

    const { data: details } = await supabase
        .from('billing_details')
        .select(`
            amount,
            service:services(code, name),
            monthly_billing:monthly_billing(fiscal_month, fiscal_year)
        `);

    // Filter for 2026 and group by service and month
    const byServiceMonth = {};
    details?.forEach(d => {
        if (d.monthly_billing?.fiscal_year !== 2026) return;

        const month = d.monthly_billing.fiscal_month;
        const code = d.service?.code || 'UNKNOWN';
        const key = `${code}-${month}`;

        if (!byServiceMonth[key]) {
            byServiceMonth[key] = { code, month, name: d.service?.name, total: 0, count: 0 };
        }
        byServiceMonth[key].total += Number(d.amount || 0);
        byServiceMonth[key].count++;
    });

    // Print by month
    const months = [...new Set(Object.values(byServiceMonth).map(x => x.month))].sort((a, b) => a - b);

    months.forEach(month => {
        console.log(`\n--- MES ${month} - Billing Details ---`);
        Object.values(byServiceMonth)
            .filter(x => x.month === month && x.total > 0)
            .forEach(x => {
                console.log(`  ${x.code}: ${x.total} (${x.count} registros) - ${x.name}`);
            });
    });
}

debugMatrixData().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
