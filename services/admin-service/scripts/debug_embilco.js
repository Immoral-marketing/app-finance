
import supabase from '../src/config/supabase.js';

async function debugEmbilco() {
    // Get Client
    const { data: client } = await supabase
        .from('clients')
        .select('id, name, fee_config')
        .ilike('name', 'Embilco')
        .single();

    if (!client) {
        console.log('Client Embilco not found');
        return;
    }

    console.log('Client:', client.name);
    console.log('Fee Config:', JSON.stringify(client.fee_config, null, 2));

    // Get Billing
    const { data: billing } = await supabase
        .from('monthly_billing')
        .select('*')
        .eq('client_id', client.id)
        .order('fiscal_year', { ascending: false }) // Get latest
        .limit(1)
        .single();

    if (billing) {
        console.log('Latest Billing Record:', billing);
    } else {
        console.log('No billing record found');
    }
}

debugEmbilco();
