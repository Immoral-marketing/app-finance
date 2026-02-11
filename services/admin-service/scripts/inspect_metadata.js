
import supabase from '../src/config/supabase.js';

async function inspectMetadata() {
    console.log('--- DEPARTMENTS ---');
    const { data: depts } = await supabase.from('departments').select('*');
    console.table(depts);

    console.log('\n--- SERVICES ---');
    const { data: svcs } = await supabase.from('services').select('code, name, department_id').order('department_id');
    console.table(svcs);

    console.log('\n--- ACTUALS ---');
    const { data: actuals } = await supabase.from('media_investment_actuals').select('*').limit(5);
    console.log('Sample Actuals:', actuals);
}

inspectMetadata();
