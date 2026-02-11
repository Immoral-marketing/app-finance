import supabase from '../src/config/supabase.js';

const PLATFORMS = [
    { name: 'Branding', code: 'BRANDING', display_order: 10 },
    { name: 'Facebook Ads', code: 'META', display_order: 20 },
    { name: 'Google Ads', code: 'GOOGLE', display_order: 30 },
    { name: 'LinkedIn', code: 'LINKEDIN', display_order: 40 },
    { name: 'Pinterest', code: 'PINTEREST', display_order: 50 },
    { name: 'Spotify', code: 'SPOTIFY', display_order: 60 },
    { name: 'Apple Ads', code: 'APPLE', display_order: 70 },
    { name: 'Microsoft Ads', code: 'MICROSOFT', display_order: 80 },
];

async function seedPlatforms() {
    console.log('Seeding Platforms...');

    for (const p of PLATFORMS) {
        const { error } = await supabase
            .from('ad_platforms')
            .upsert({
                name: p.name,
                code: p.code,
                display_order: p.display_order,
                is_active: true
            }, { onConflict: 'code' });

        if (error) console.error(`Error upserting ${p.name}:`, error.message);
        else console.log(`Processed ${p.name}`);
    }
}

seedPlatforms();
