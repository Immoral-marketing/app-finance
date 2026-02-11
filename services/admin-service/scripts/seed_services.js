import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const departments = {
    'IMMED': 'Immedia',
    'IMCONT': 'Imcontent',
    'IMMOR': 'Immoralia',
    'IMMORAL': 'Immoral' // General
};

const servicesData = [
    // IMMEDIA
    { dept: 'IMMED', code: 'PAID_MEDIA_STRATEGY', name: 'Estrategia y Gestión de Campañas de Paid Media', type: 'revenue', order: 10 },
    { dept: 'IMMED', code: 'PAID_MEDIA_SETUP', name: 'Set-up inicial', type: 'revenue', order: 20 },

    // IMCONTENT
    { dept: 'IMCONT', code: 'BRANDING', name: 'Branding', type: 'revenue', order: 10 },
    { dept: 'IMCONT', code: 'CONTENT_DESIGN', name: 'Diseño de contenido', type: 'revenue', order: 20 },
    { dept: 'IMCONT', code: 'AI_CONTENT', name: 'Generación de contenido con IA', type: 'revenue', order: 30 },
    { dept: 'IMCONT', code: 'SOCIAL_MEDIA_MGMT', name: 'Gestión de RRSS', type: 'revenue', order: 40 },
    { dept: 'IMCONT', code: 'INFLUENCER_UGC', name: 'Gestión de Influencers y UGC', type: 'revenue', order: 50 },
    { dept: 'IMCONT', code: 'CONTENT_SETUP', name: 'Setup Inicial', type: 'revenue', order: 60 },

    // IMMORALIA
    { dept: 'IMMOR', code: 'AGENCY_AUTO', name: 'Agency Automation', type: 'revenue', order: 10 },
    { dept: 'IMMOR', code: 'CONSULTING_AUTO', name: 'Consultoría y automatización de procesos', type: 'revenue', order: 20 },
    { dept: 'IMMOR', code: 'SEO', name: 'SEO', type: 'revenue', order: 30 },
    { dept: 'IMMOR', code: 'WEB_DEV', name: 'Web dev', type: 'revenue', order: 40 },

    // IMMORAL (General)
    { dept: 'IMMORAL', code: 'MKT_AUTO_EMAIL', name: 'Estrategia y gestión de marketing automation y email marketing', type: 'revenue', order: 10 },
    { dept: 'IMMORAL', code: 'OTHER_HOURS', name: 'Horas/Otros', type: 'revenue', order: 20 }
];

async function seed() {
    console.log('Starting seed...');

    // 1. Get Department IDs
    const { data: deptData, error: deptError } = await supabase.from('departments').select('id, code');
    if (deptError) {
        console.error('Error fetching departments:', deptError);
        return;
    }

    const deptMap = {};
    deptData.forEach(d => deptMap[d.code] = d.id);

    console.log('Departments found:', Object.keys(deptMap));

    // 2. Insert Services
    for (const service of servicesData) {
        const deptId = deptMap[service.dept];
        if (!deptId) {
            console.warn(`Department ${service.dept} not found, skipping ${service.name}`);
            continue;
        }

        const { error } = await supabase
            .from('services')
            .upsert({
                department_id: deptId,
                name: service.name,
                code: service.code,
                service_type: service.type,
                display_order: service.order
            }, { onConflict: 'department_id, code' }); // Assuming unique constraint exists

        if (error) {
            console.error(`Error inserting ${service.name}:`, error.message);
        } else {
            console.log(`Upserted: ${service.name}`);
        }
    }

    console.log('Seeding complete.');
}

seed();
