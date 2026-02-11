import supabase from '../src/config/supabase.js';

async function debugPaidMediaSimple() {
    const year = 2026;
    const month = 2;

    console.log('=== PAID MEDIA FROM FEE_PAID (monthly_billing) ===\n');

    const { data: billings } = await supabase
        .from('monthly_billing')
        .select(`
            id, fiscal_month, fee_paid,
            client:clients(id, name, vertical:verticals(name))
        `)
        .eq('fiscal_year', year)
        .eq('fiscal_month', month);

    let totalFeePaid = 0;
    let imfilmsTotal = 0;
    let generalTotal = 0;

    billings?.forEach(b => {
        const feePaid = Number(b.fee_paid || 0);
        const vertical = b.client?.vertical?.name || 'Sin vertical';
        const isImfilms = vertical.toLowerCase() === 'imfilms';

        if (feePaid > 0) {
            const tag = isImfilms ? '[IMFILMS]' : '[GENERAL]';
            console.log(`${tag} ${b.client?.name}: fee_paid=${feePaid} (${vertical})`);
            totalFeePaid += feePaid;
            if (isImfilms) {
                imfilmsTotal += feePaid;
            } else {
                generalTotal += feePaid;
            }
        }
    });

    console.log('\n=== RESULTADO PARA P&L ===');
    console.log(`Total Fee Paid (columna Matrix): ${totalFeePaid}`);
    console.log(`Paid Imfilms: ${imfilmsTotal}`);
    console.log(`Paid General (Total - Imfilms): ${generalTotal}`);
    console.log(`Verificación: ${imfilmsTotal} + ${generalTotal} = ${imfilmsTotal + generalTotal}`);
}

debugPaidMediaSimple().then(() => process.exit(0)).catch(console.error);
