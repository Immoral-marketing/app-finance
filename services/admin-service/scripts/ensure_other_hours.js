import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Check if OTHER_HOURS service exists
    const { data: existing } = await supabase
        .from('services')
        .select('id, code, name, department_id')
        .eq('code', 'OTHER_HOURS');

    console.log('Existing OTHER_HOURS service:', existing);

    if (existing && existing.length > 0) {
        console.log('Service already exists!');
        return;
    }

    // Get departments
    const { data: deptData } = await supabase.from('departments').select('id, code, name');
    console.log('Departments:', deptData?.map(d => `${d.code}: ${d.name} (${d.id})`));

    const immoralDept = deptData?.find(d => d.code === 'IMMORAL');
    if (!immoralDept) {
        console.log('IMMORAL department not found!');
        return;
    }

    // Create the service
    const { data: newSvc, error } = await supabase
        .from('services')
        .insert({
            department_id: immoralDept.id,
            name: 'Horas/Otros',
            code: 'OTHER_HOURS',
            service_type: 'revenue',
            display_order: 20,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Created:', newSvc);
}

main().catch(console.error);
