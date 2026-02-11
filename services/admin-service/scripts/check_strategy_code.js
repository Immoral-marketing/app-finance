
import supabase from '../src/config/supabase.js';

async function checkStrategyService() {
    console.log('--- Checking Paid Media Strategy Service ---');
    const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .ilike('name', '%Estrategia%');

    if (error) {
        console.error(error);
        return;
    }

    if (services.length === 0) {
        console.log('No services found with "Estrategia" in name.');
    } else {
        services.forEach(s => {
            console.log(`Code: [${s.code}], Name: ${s.name}, ID: ${s.id}`);
        });
    }
}

checkStrategyService();
