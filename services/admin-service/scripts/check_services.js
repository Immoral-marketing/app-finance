import supabase from '../src/config/supabase.js';

async function checkServices() {
    console.log('Checking services in Imcontent...');

    const { data: dept } = await supabase
        .from('departments')
        .select('id, code, name')
        .eq('code', 'IMCONTENT')
        .single();

    if (!dept) {
        console.log('IMCONTENT department not found!');
        return;
    }

    const { data: services } = await supabase
        .from('services')
        .select('id, code, name, display_order')
        .eq('department_id', dept.id)
        .order('display_order');

    console.log('Services in IMCONTENT:');
    services.forEach(s => console.log(`  - ${s.code}: ${s.name} (order: ${s.display_order})`));
}

checkServices();
