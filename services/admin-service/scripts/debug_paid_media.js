import supabase from '../src/config/supabase.js';

async function debugPaidMedia() {
    const year = 2026;
    const month = 2; // February

    console.log('=== DEBUGGING PAID MEDIA CALCULATION ===\n');

    // 1. Get monthly_billing with fee_paid
    const { data: billings } = await supabase
        .from('monthly_billing')
        .select(`
            id, fiscal_month, fee_paid,
            client:clients(id, name, vertical:verticals(name))
        `)
        .eq('fiscal_year', year)
        .eq('fiscal_month', month);

    console.log(`Found ${billings?.length} monthly_billing records for ${year}-${month}\n`);

    let totalFeePaid = 0;
    let imfilmsTotal = 0;

    console.log('--- FEE_PAID BY CLIENT ---');
    billings?.forEach(b => {
        const feePaid = Number(b.fee_paid || 0);
        const vertical = b.client?.vertical?.name || 'Sin vertical';
        const clientName = b.client?.name || 'Unknown';

        if (feePaid > 0) {
            console.log(`${clientName}: ${feePaid} (${vertical})`);
            totalFeePaid += feePaid;

            if (vertical.toLowerCase() === 'imfilms') {
                imfilmsTotal += feePaid;
            }
        }
    });

    console.log('\n--- TOTALS FROM FEE_PAID ---');
    console.log(`Total Fee Paid: ${totalFeePaid}`);
    console.log(`Imfilms Total: ${imfilmsTotal}`);
    console.log(`Paid General (Total - Imfilms): ${totalFeePaid - imfilmsTotal}`);

    // 2. Now check billing_details for PAID_MEDIA_STRATEGY
    console.log('\n--- BILLING_DETAILS FOR PAID_MEDIA_STRATEGY ---');

    const { data: details } = await supabase
        .from('billing_details')
        .select(`
            amount,
            service:services(code, name),
            monthly_billing:monthly_billing(
                fiscal_month, fiscal_year,
                client:clients(name, vertical:verticals(name))
            )
        `);

    const strategyDetails = details?.filter(d =>
        d.service?.code === 'PAID_MEDIA_STRATEGY' &&
        d.monthly_billing?.fiscal_year === year &&
        d.monthly_billing?.fiscal_month === month
    );

    let detailsTotal = 0;
    let detailsImfilms = 0;

    strategyDetails?.forEach(d => {
        const amount = Number(d.amount || 0);
        const vertical = d.monthly_billing?.client?.vertical?.name || '';
        const clientName = d.monthly_billing?.client?.name || 'Unknown';

        if (amount > 0) {
            console.log(`${clientName}: ${amount} (${vertical})`);
            detailsTotal += amount;
            if (vertical.toLowerCase() === 'imfilms') {
                detailsImfilms += amount;
            }
        }
    });

    console.log('\n--- TOTALS FROM BILLING_DETAILS ---');
    console.log(`Total from details: ${detailsTotal}`);
    console.log(`Imfilms from details: ${detailsImfilms}`);

    console.log('\n--- COMPARISON ---');
    console.log(`fee_paid Total: ${totalFeePaid}`);
    console.log(`billing_details Total: ${detailsTotal}`);
    console.log(`Difference: ${totalFeePaid - detailsTotal}`);
}

debugPaidMedia().then(() => process.exit(0)).catch(console.error);
