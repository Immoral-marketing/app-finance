import supabase from '../src/config/supabase.js';

async function checkImcontentServices() {
    console.log('Checking all services in Imcontent...\n');

    const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .eq('code', 'IMCONT')
        .single();

    if (!dept) {
        console.log('IMCONT not found');
        return;
    }

    const { data: services } = await supabase
        .from('services')
        .select('id, code, name, display_order')
        .eq('department_id', dept.id)
        .order('display_order');

    console.log('Current services in IMCONT:');
    services.forEach(s => console.log(`  ${s.display_order}. ${s.code}: ${s.name}`));

    console.log('\n✅ User wants these 6 columns:');
    console.log('  1. Branding (BRANDING)');
    console.log('  2. Diseño de contenido (CONTENT_DESIGN)');
    console.log('  3. Generación de contenido con IA (AI_CONTENT)');
    console.log('  4. Gestión de RRSS (SOCIAL_MEDIA_MGMT)');
    console.log('  5. Estrategia Digital (DIGITAL_STRATEGY)');
    console.log('  6. Gestión de Influencers y UGC (INFLUENCER_UGC)');
}

checkImcontentServices();
