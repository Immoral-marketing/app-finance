import supabase from '../src/config/supabase.js';

async function listImfilms() {
    console.log('=== IMFILMS CLIENTS (MONTH 2) ===');

    const { data: billings } = await supabase
        .from('monthly_billing')
        .select(`
            id, fiscal_month, fee_paid, 
            client:clients(id, name, vertical:verticals(name))
        `)
        .eq('fiscal_year', 2026)
        .eq('fiscal_month', 2);

    const imfilms = billings.filter(b => b.client.vertical?.name.toLowerCase() === 'imfilms');

    if (imfilms.length === 0) {
        console.log('No Imfilms records found in Month 2.');
    } else {
        imfilms.forEach((b, i) => {
            console.log(`${i + 1}. ${b.client.name} (ID: ${b.client.id.split('-')[0]}...) - Fee: ${b.fee_paid}`);
        });
    }
}

listImfilms().then(() => process.exit(0)).catch(console.error);
