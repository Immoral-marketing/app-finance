
import supabase from '../src/config/supabase.js';

async function enablePlatformCosts() {
    const { data: clients } = await supabase.from('clients').select('id, fee_config');

    for (const c of clients) {
        if (c.fee_config) {
            const newConfig = { ...c.fee_config, use_platform_costs: true };
            await supabase.from('clients').update({ fee_config: newConfig }).eq('id', c.id);
            console.log(`Updated client ${c.id}`);
        }
    }
    console.log('Done');
}

enablePlatformCosts();
