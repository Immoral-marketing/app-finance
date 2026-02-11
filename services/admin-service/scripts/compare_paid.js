import supabase from '../src/config/supabase.js';

async function compare() {
    // Get all monthly_billing with fee_paid for Feb 2026
    const { data: mbs } = await supabase
        .from('monthly_billing')
        .select('id, fee_paid, client:clients(name, vertical:verticals(name))')
        .eq('fiscal_year', 2026)
        .eq('fiscal_month', 2);

    // Get all billing_details with PAID_MEDIA_STRATEGY
    const { data: dets } = await supabase
        .from('billing_details')
        .select('monthly_billing_id, amount, service:services(code)');

    // Map billing_details by monthly_billing_id
    const stratMap = {};
    dets?.filter(d => d.service?.code === 'PAID_MEDIA_STRATEGY').forEach(d => {
        stratMap[d.monthly_billing_id] = Number(d.amount || 0);
    });

    let totalFeePaid = 0;
    let totalDetail = 0;
    let missing = [];

    mbs?.sort((a, b) => (a.client?.name || '').localeCompare(b.client?.name || '')).forEach(mb => {
        const fp = Number(mb.fee_paid || 0);
        const da = stratMap[mb.id];
        const vertical = mb.client?.vertical?.name || 'N/A';

        if (fp > 0) {
            totalFeePaid += fp;
            if (da !== undefined) {
                totalDetail += da;
            }
            const status = da !== undefined ? 'OK' : 'MISSING DETAIL';
            console.log(`${(mb.client?.name || '').padEnd(25)} | fee_paid=${String(fp).padStart(6)} | detail=${da !== undefined ? String(da).padStart(6) : '  N/A '} | ${vertical.padEnd(12)} | ${status}`);

            if (da === undefined) {
                missing.push({ name: mb.client?.name, fee_paid: fp, id: mb.id });
            }
        }
    });

    console.log('\n--- TOTALS ---');
    console.log(`Total fee_paid (what Matrix shows): ${totalFeePaid}`);
    console.log(`Total billing_details PAID_MEDIA_STRATEGY: ${totalDetail}`);
    console.log(`Difference (missing from details): ${totalFeePaid - totalDetail}`);

    if (missing.length > 0) {
        console.log('\n--- MISSING CLIENTS (have fee_paid but no billing_detail) ---');
        missing.forEach(m => console.log(`  ${m.name}: fee_paid=${m.fee_paid} (mb_id: ${m.id})`));
    }
}

compare().then(() => process.exit(0)).catch(console.error);
