import supabase from '../src/config/supabase.js';

async function checkDuplicateClients() {
    console.log('=== CHECKING DUPLICATE CLIENTS ===');

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, vertical:verticals(name)')
        .eq('is_active', true);

    const names = {};
    clients.forEach(c => {
        const name = c.name.toLowerCase().trim();
        if (!names[name]) names[name] = [];
        names[name].push(c);
    });

    let found = false;
    for (const name in names) {
        if (names[name].length > 1) {
            console.log(`\nDuplicate Client Name: "${names[name][0].name}"`);
            names[name].forEach(c => {
                console.log(`  - ID: ${c.id}, Vertical: ${c.vertical?.name}`);
            });
            found = true;
        }
    }

    if (!found) console.log('No duplicate client names found.');
}

checkDuplicateClients().then(() => process.exit(0)).catch(console.error);
