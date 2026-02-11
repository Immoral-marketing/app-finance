
import supabase from '../src/config/supabase.js';
import fs from 'fs';

async function dumpServices() {
    const { data: services, error } = await supabase.from('services').select('*').order('name');
    if (error) { console.error(error); return; }

    const output = services.map(s => `[${s.code}] ${s.name}`).join('\n');
    fs.writeFileSync('services_dump.txt', output);
    console.log('Services dumped to services_dump.txt');
}
dumpServices();
