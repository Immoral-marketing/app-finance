import supabase from '../src/config/supabase.js';

async function getMappings() {
    const { data: depts } = await supabase.from('departments').select('name, id');
    const { data: cats } = await supabase.from('expense_categories').select('name, id, code');
    const { data: svcs } = await supabase.from('services').select('name, id, code');

    console.log('// DEPARTMENT MAPPINGS');
    const deptMap = {};
    depts?.forEach(d => deptMap[d.name] = d.id);
    console.log(JSON.stringify(deptMap, null, 2));

    console.log('\n// CATEGORY MAPPINGS');
    const catMap = {};
    cats?.forEach(c => catMap[c.name] = c.id);
    console.log(JSON.stringify(catMap, null, 2));

    console.log('\n// SERVICE MAPPINGS');
    const svcMap = {};
    svcs?.forEach(s => svcMap[s.name] = s.id);
    console.log(JSON.stringify(svcMap, null, 2));
}

getMappings().then(() => process.exit(0)).catch(console.error);
