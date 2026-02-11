import supabase from '../src/config/supabase.js';

async function debugAll() {
    const year = 2026;
    const month = 2;

    // Get ALL monthly_billing with fee_paid
    const { data: billings } = await supabase
        .from('monthly_billing')
        .select(`
            id, fiscal_month, fee_paid, total_actual_investment,
            client:clients(id, name, vertical:verticals(name))
        `)
        .eq('fiscal_year', year)
        .eq('fiscal_month', month);

    let totalFeePaid = 0;
    let imfilmsTotal = 0;

    console.log('CLIENT                    | VERTICAL    | INVESTMENT | FEE_PAID | TAG');
    console.log('-'.repeat(85));

    billings?.sort((a, b) => (a.client?.name || '').localeCompare(b.client?.name || '')).forEach(b => {
        const feePaid = Number(b.fee_paid || 0);
        const inv = Number(b.total_actual_investment || 0);
        const vertical = b.client?.vertical?.name || 'N/A';
        const isImfilms = vertical.toLowerCase() === 'imfilms';
        const tag = isImfilms ? 'IMFILMS' : 'GENERAL';
        const name = (b.client?.name || 'Unknown').padEnd(25);
        const vertPad = vertical.padEnd(12);

        console.log(`${name} | ${vertPad} | ${String(inv).padStart(10)} | ${String(feePaid).padStart(8)} | ${tag}`);

        totalFeePaid += feePaid;
        if (isImfilms) imfilmsTotal += feePaid;
    });

    console.log('-'.repeat(85));
    console.log(`TOTAL fee_paid: ${totalFeePaid}`);
    console.log(`Imfilms total: ${imfilmsTotal}`);
    console.log(`Paid General (Total - Imfilms): ${totalFeePaid - imfilmsTotal}`);
}

debugAll().then(() => process.exit(0)).catch(console.error);
