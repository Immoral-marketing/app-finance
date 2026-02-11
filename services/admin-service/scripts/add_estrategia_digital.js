import supabase from '../src/config/supabase.js';

async function addEstrategiaDigital() {
    console.log('Adding "Estrategia Digital" to Imcontent...');

    // Get Imcontent department
    const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('code', 'IMCONT')
        .single();

    if (deptError || !dept) {
        console.error('Department not found:', deptError);
        return;
    }

    // Insert service
    const { error: insertError } = await supabase
        .from('services')
        .insert({
            department_id: dept.id,
            name: 'Estrategia Digital',
            code: 'DIGITAL_STRATEGY',
            display_order: 35,
            service_type: 'revenue'
        });

    if (insertError) {
        console.error('Error inserting:', insertError);
    } else {
        console.log('✅ "Estrategia Digital" added successfully!');
    }
}

addEstrategiaDigital();
