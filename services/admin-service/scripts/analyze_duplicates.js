import supabase from '../src/config/supabase.js';

async function fixData() {
    console.log('=== ANALYZING DATA FOR CLEANUP ===');

    // 1. Get all 2026 monthly_billing
    const { data: billings } = await supabase
        .from('monthly_billing')
        .select(`
            id, fiscal_month, fee_paid, 
            client:clients(id, name, vertical:verticals(name))
        `)
        .eq('fiscal_year', 2026);

    // Group by Client + Month to find duplicates
    const matrix = {}; // key: client_id, val: { 1: [rows], 2: [rows]... }

    billings.forEach(b => {
        const cid = b.client.id;
        if (!matrix[cid]) matrix[cid] = {};
        const month = b.fiscal_month;
        if (!matrix[cid][month]) matrix[cid][month] = [];
        matrix[cid][month].push(b);
    });

    // Check for Duplicates (same client, same month)
    console.log('\n--- DUPLICATES CHECK ---');
    let duplicatesFound = 0;
    for (const cid in matrix) {
        for (const m in matrix[cid]) {
            if (matrix[cid][m].length > 1) {
                console.log(`\nDuplicate for Client ${matrix[cid][m][0].client.name} (Month ${m}):`);
                matrix[cid][m].forEach(r => {
                    console.log(`  - ID: ${r.id}, Fee: ${r.fee_paid}`);
                });
                duplicatesFound++;
            }
        }
    }

    if (duplicatesFound === 0) console.log('No exact duplicates (same client/month) found.');

    // Analyze Imfilms Distribution
    console.log('\n--- IMFILMS DISTRIBUTION ---');
    const imfilms = billings.filter(b => b.client.vertical?.name.toLowerCase() === 'imfilms');
    imfilms.forEach(b => {
        console.log(`Month ${b.fiscal_month}: ${b.client.name} - Fee: ${b.fee_paid} (ID: ${b.id})`);
    });

    console.log('\n=== RECOMMENDATION ===');
    console.log('If you see Imfilms data in Month 2 that should be in Month 1, we can move it.');
    console.log('Use updated script to execute the move.');
}

fixData().then(() => process.exit(0)).catch(console.error);
