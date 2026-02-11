
import supabase from '../src/config/supabase.js';

async function checkServices() {
    console.log('--- Checking Services ---');
    const { data: services, error } = await supabase
        .from('services')
        .select('id, code, name')
        .order('name');

    if (error) {
        console.error(error);
        return;
    }

    services.forEach(s => {
        console.log(`[${s.code}] ${s.name} (ID: ${s.id})`);
    });
}

checkServices();
