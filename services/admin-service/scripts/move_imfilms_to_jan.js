import supabase from '../src/config/supabase.js';

async function moveImfilmsToJan() {
    console.log('=== MOVING IMFILMS DATA FROM FEB TO JAN ===');

    // 1. Get Imfilms records in Month 2
    const { data: billings } = await supabase
        .from('monthly_billing')
        .select(`
            id, fiscal_month, fee_paid, client_id,
            client:clients(id, name, vertical:verticals(name))
        `)
        .eq('fiscal_year', 2026)
        .eq('fiscal_month', 2);

    const imfilms = billings.filter(b => b.client.vertical?.name.toLowerCase() === 'imfilms');

    console.log(`Found ${imfilms.length} Imfilms records in Feb.`);

    for (const b of imfilms) {
        console.log(`Processing ${b.client.name} (ID: ${b.id})...`);

        // Check if Month 1 record exists
        const { data: existingJan } = await supabase
            .from('monthly_billing')
            .select('id')
            .eq('client_id', b.client_id)
            .eq('fiscal_year', 2026)
            .eq('fiscal_month', 1)
            .single();

        if (existingJan) {
            console.log(`  WARNING: Record already exists in Jan (ID: ${existingJan.id}). Skipping move to avoid collision.`);
        } else {
            // Update to Month 1
            const { error } = await supabase
                .from('monthly_billing')
                .update({ fiscal_month: 1 })
                .eq('id', b.id);

            if (error) {
                console.error(`  Error moving record: ${error.message}`);
            } else {
                console.log(`  Moved to Jan successfully.`);
            }
        }
    }
}

moveImfilmsToJan().then(() => process.exit(0)).catch(console.error);
