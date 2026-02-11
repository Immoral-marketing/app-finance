import supabase from '../src/config/supabase.js';

async function listDepartments() {
    console.log('Listing all departments...');

    const { data: depts } = await supabase
        .from('departments')
        .select('id, code, name')
        .order('code');

    console.log('Departments:');
    depts.forEach(d => console.log(`  - ${d.code}: ${d.name}`));
}

listDepartments();
