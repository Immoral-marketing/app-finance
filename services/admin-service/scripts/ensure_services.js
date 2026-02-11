import supabase from '../src/config/supabase.js';

// Revenue structure from PLMatrix.tsx
const REVENUE_STRUCTURE = [
    { dept: 'Immedia', services: ['Paid General', 'Paid imfilms', 'Setup inicial'] },
    { dept: 'Imcontent', services: ['Branding', 'Diseño', 'Contenido con IA', 'RRSS', 'Estrategia Digital', 'Influencers'] },
    { dept: 'Immoralia', services: ['Setup inicial IA', 'Automation', 'Consultoría'] },
    { dept: 'Imloyal', services: ['Web dev', 'CRM', 'Comisiones'] },
    { dept: 'Imseo', services: ['SEO', 'Comisiones'] },
    { dept: 'Immoral', services: ['Otros servicios', 'Otras comisiones'] },
    { dept: 'Imcontent', services: ['Budget Nutfruit'] }, // Note: Imcontent again
    { dept: 'Imsales', services: ['Captación'] },
];

async function ensureServices() {
    console.log('--- ENSURING SERVICES EXIST ---');

    for (const group of REVENUE_STRUCTURE) {
        const { dept: deptName, services } = group;

        console.log(`Processing Department: ${deptName}`);

        // 1. Get Department ID
        const { data: deptData } = await supabase
            .from('departments')
            .select('id, code')
            .eq('name', deptName)
            .maybeSingle();

        if (!deptData) {
            console.error(`Department not found: ${deptName}`);
            continue;
        }

        const deptId = deptData.id;
        const deptCode = deptData.code || deptName.toUpperCase();

        for (const serviceName of services) {
            // Generate a code
            const cleanName = serviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
            const serviceCode = `${deptCode}_${cleanName}`.substring(0, 49); // Max 50 chars usually

            // Check if exists
            const { data: existing } = await supabase
                .from('services')
                .select('id')
                .eq('department_id', deptId)
                .eq('name', serviceName)
                .maybeSingle();

            if (!existing) {
                console.log(`Creating service: ${serviceName} (${serviceCode})`);
                const { error } = await supabase.from('services').insert({
                    department_id: deptId,
                    name: serviceName,
                    code: serviceCode,
                    is_active: true
                });

                if (error) {
                    // Ignore unique constraint error on code if logic implies it might happen, but usually name is unique per dept
                    if (error.code === '23505') console.log(`Service/Code already exists (race condition?): ${serviceName}`);
                    else console.error(`Error creating ${serviceName}:`, error.message);
                }
            } else {
                // console.log(`Service exists: ${serviceName}`);
            }
        }
    }
}

ensureServices().then(() => process.exit(0)).catch(console.error);
