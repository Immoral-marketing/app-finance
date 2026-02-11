
import supabase from '../src/config/supabase.js';

async function debugFeeConfig() {
    console.log('--- Debugging Fee Config ---');
    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, fee_config')
        .order('name');

    if (error) {
        console.error(error);
        return;
    }

    clients.forEach(c => {
        const config = c.fee_config;
        if (!config) {
            console.log(`[${c.name}] NO CONFIG`);
            return;
        }

        console.log(`[${c.name}] Type: ${config.fee_type}`);
        if (config.fee_type === 'variable') {
            console.log(`   Ranges:`, JSON.stringify(config.variable_ranges));
            // Test logic against dummy investment
            const testInv = 5000;
            if (config.variable_ranges) {
                const range = config.variable_ranges.find(rg => {
                    const min = Number(rg.min || 0);
                    const max = rg.max === null ? Infinity : Number(rg.max);
                    return testInv >= min && testInv <= max;
                });
                console.log(`   Test Inv ${testInv} -> Matches Pct: ${range ? range.pct : 'NONE'}`);
            }
        } else {
            console.log(`   Fixed Pct: ${config.fixed_pct}`);
        }
    });
}

debugFeeConfig();
