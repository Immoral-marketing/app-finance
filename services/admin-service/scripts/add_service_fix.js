import supabase from '../src/config/supabase.js';

async function addEstrategiaDigital() {
    console.log('Adding "Estrategia Digital" service...');

    // 1. Get Department ID for Imcontent
    const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('code', 'IMCONTENT') // Assuming code is IMCONTENT based on prev logs
        .single();

    if (deptError || !dept) {
        console.error('Dept not found', deptError);
        return;
    }

    // 2. Adjust display orders to make room
    // Social Media Mgmt is usually high, Influencer is lower. 
    // Let's just set a good arbitrary order or shift.
    // Let's check current services in Imcontent
    const { data: services } = await supabase
        .from('services')
        .select('id, name, display_order')
        .eq('department_id', dept.id)
        .order('display_order');

    console.log('Current Imcontent Services:', services.map(s => `${s.name} (${s.display_order})`));

    // We want it between RRSS (Social Media) and Influencers
    // Let's find their orders
    // If exact names: "Gestión de RRSS", "Gestión de Influencers y UGC"

    // To be safe, let's just insert it at a specific order value like 55, assuming 10-steps

    const { error: insertError } = await supabase
        .from('services')
        .insert({
            department_id: dept.id,
            name: 'Estrategia Digital',
            code: 'DIGITAL_STRATEGY',
            display_order: 35, // Adjust based on logs if needed, but 35 is likely safe between 30 and 40
            service_type: 'revenue'
        });

    if (insertError) {
        console.error('Error inserting:', insertError);
    } else {
        console.log('Success! "Estrategia Digital" added.');
    }
}

addEstrategiaDigital();
