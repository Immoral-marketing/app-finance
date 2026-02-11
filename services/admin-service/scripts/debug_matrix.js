
import supabase from '../src/config/supabase.js';

async function checkServices() {
    console.log('Checking Immedia Services...');
    const { data: dept } = await supabase.from('departments').select('id').eq('code', 'IMMEDIA').single();
    if (dept) {
        const { data: svcs } = await supabase.from('services').select('code, name, display_order').eq('department_id', dept.id);
        console.table(svcs);
    } else {
        console.log('IMMEDIA dept not found');
    }

    console.log('\nChecking Actuals Data...');
    const { count } = await supabase.from('media_investment_actuals').select('*', { count: 'exact', head: true });
    console.log('Total Actuals Rows:', count);
}

checkServices();
