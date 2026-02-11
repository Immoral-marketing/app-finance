
import fs from 'fs';
import supabase from '../src/config/supabase.js';

async function check() {
    const { data: byCode } = await supabase.from('services').select('code, name').eq('code', 'PAID_MEDIA_STRATEGY');
    const { data: byName } = await supabase.from('services').select('code, name').ilike('name', '%Paid Media%');

    const output = {
        byCode_PAID_MEDIA_STRATEGY: byCode,
        byName_PaidMedia: byName
    };

    fs.writeFileSync('service_check_output.json', JSON.stringify(output, null, 2));
    console.log('Done');
}

check();
