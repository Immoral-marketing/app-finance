
import supabase from '../src/config/supabase.js';

async function run() {
    console.log('--- UPDATING SERVICE NAMES ---');

    const updates = [
        { code: 'PAID_MEDIA_STRATEGY', name: 'Estrategia y Gestión de Campañas de Paid Media' },
        { code: 'PAID_MEDIA_SETUP', name: 'Set-up Inicial' },
        { code: 'IMMORALIA_SETUP', name: 'Set-up Inicial IA' },
        { code: 'MKT_AUTO_EMAIL', name: 'Estrategia y Gestión de marketing y email marketing' }
    ];

    for (const u of updates) {
        const { error } = await supabase
            .from('services')
            .update({ name: u.name })
            .eq('code', u.code);

        if (error) console.error(`Error updating ${u.code}:`, error.message);
        else console.log(`Updated ${u.code} -> ${u.name}`);
    }

    console.log('\n--- DEBUGGING ACTUALS ---');
    const { data, error } = await supabase
        .from('media_investment_actuals')
        .select('*');

    if (error) {
        console.error('Error fetching actuals:', error);
    } else {
        console.log('Actuals Data:', data);
        console.log('Count:', data ? data.length : 0);
    }
}

run();
