
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

// EXACT GROUPING FROM USER REQUEST
const servicesData = [
    // === IMMEDIA ===
    { dept: 'IMMED', code: 'PAID_MEDIA_STRATEGY', name: 'Estrategia y Gestión de Campañas de Paid Media', type: 'revenue', order: 10 },
    { dept: 'IMMED', code: 'PAID_MEDIA_SETUP', name: 'Set-up Inicial', type: 'revenue', order: 20 },

    // === IMCONTENT ===
    { dept: 'IMCONT', code: 'BRANDING', name: 'Branding', type: 'revenue', order: 10 },
    { dept: 'IMCONT', code: 'CONTENT_DESIGN', name: 'Diseño de Contenido', type: 'revenue', order: 20 },
    { dept: 'IMCONT', code: 'AI_CONTENT', name: 'Generación de contenido con IA', type: 'revenue', order: 30 },
    { dept: 'IMCONT', code: 'SOCIAL_MEDIA_MGMT', name: 'Gestión de RRSS', type: 'revenue', order: 40 },
    { dept: 'IMCONT', code: 'INFLUENCER_UGC', name: 'Gestión de Influencers y UGC', type: 'revenue', order: 50 },

    // === IMMORALIA ===
    // Note: User listed Setup for Immoralia too
    { dept: 'IMMOR', code: 'IMMORALIA_SETUP', name: 'Set-up Inicial', type: 'revenue', order: 5 },
    { dept: 'IMMOR', code: 'AGENCY_AUTO', name: 'Agency Automation', type: 'revenue', order: 10 },
    { dept: 'IMMOR', code: 'CONSULTING_AUTO', name: 'Consultoría y automatización de procesos', type: 'revenue', order: 20 },

    // === IMMORAL (General/Other) ===
    // Moved SEO and Web Dev here as requested
    { dept: 'IMMORAL', code: 'SEO', name: 'SEO', type: 'revenue', order: 10 },
    { dept: 'IMMORAL', code: 'WEB_DEV', name: 'Web Dev', type: 'revenue', order: 20 },
    { dept: 'IMMORAL', code: 'MKT_AUTO_EMAIL', name: 'Estrategia y Gestión de marketing y email marketing', type: 'revenue', order: 30 }
];

async function seed() {
    console.log('Starting V2 seed...');

    const { data: deptData } = await supabase.from('departments').select('id, code');
    const deptMap = {};
    deptData.forEach(d => deptMap[d.code] = d.id);

    console.log('Departments:', Object.keys(deptMap));

    for (const service of servicesData) {
        const deptId = deptMap[service.dept];
        if (!deptId) continue;

        // Check if exists to potentially update department if moved
        // We match by code primarily? Data uses (department_id, code) unique. 
        // If we moved SEO from IMMOR to IMMORAL, we need to handle that shift.
        // For simplicity, we'll try to update purely by name or code if possible, 
        // but 'code' is unique within department. 
        // Let's delete old SEO/WebDev from IMMOR if they exist there to avoid confusion,
        // or just insert the new ones.

        const { error } = await supabase
            .from('services')
            .upsert({
                department_id: deptId,
                name: service.name,
                code: service.code,
                service_type: service.type,
                display_order: service.order
            }, { onConflict: 'department_id, code' });

        if (error) console.error(`Error ${service.name}:`, error.message);
        else console.log(`Upserted: ${service.name} in ${service.dept}`);
    }

    console.log('Seeding V2 complete.');
}

seed();
