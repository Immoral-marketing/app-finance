import supabase from '../src/config/supabase.js';

async function checkAndCreate() {
    const missingDepts = ['Imsales', 'Imfilms', 'Imfashion', 'Imseo', 'Imloyal'];
    const missingCats = ['Adspent', 'Adspent Nutfruit', 'Influencers', 'Jorge Orts', 'The connector', 'Marc', 'Christian', 'Gemelos', 'Olga']; // Also check names from frontend structure

    console.log('--- CHECKING DEPARTMENTS ---');
    for (const name of missingDepts) {
        let { data, error } = await supabase.from('departments').select('id').eq('name', name).maybeSingle();
        if (!data) {
            console.log(`Creating department: ${name}`);
            const { error: insertError } = await supabase.from('departments').insert({ name, code: name.toUpperCase() });
            if (insertError) console.error(`Error creating ${name}:`, insertError.message);
        } else {
            console.log(`Department exists: ${name}`);
        }
    }

    console.log('\n--- CHECKING CATEGORIES ---');
    for (const name of missingCats) {
        let { data, error } = await supabase.from('expense_categories').select('id').eq('name', name).maybeSingle();
        if (!data) {
            console.log(`Creating category: ${name}`);
            const { error: insertError } = await supabase.from('expense_categories').insert({ name, code: name.toUpperCase().replace(/\s+/g, '_') });
            if (insertError) console.error(`Error creating ${name}:`, insertError.message);
        } else {
            console.log(`Category exists: ${name}`);
        }
    }
}

checkAndCreate().then(() => process.exit(0)).catch(console.error);
