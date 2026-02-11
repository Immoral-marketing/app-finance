
import supabase from '../src/config/supabase.js';

async function findService() {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .ilike('name', '%Estrategia y Gestión de Campañas de Paid Media%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found Services:', data);
    }
}

findService();
