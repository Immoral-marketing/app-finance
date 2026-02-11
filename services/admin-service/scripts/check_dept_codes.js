
import supabase from '../src/config/supabase.js';

async function checkDeptCodes() {
    const { data: depts } = await supabase.from('departments').select('name, code');
    console.log('--- DEPARTMENT CODES ---');
    depts.forEach(d => console.log(`${d.name.padEnd(20)}: ${d.code}`));
}

checkDeptCodes();
