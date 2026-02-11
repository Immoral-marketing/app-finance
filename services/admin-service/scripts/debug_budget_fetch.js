
import supabase from '../src/config/supabase.js';

async function debugBudgetFetch() {
    console.log('--- DEBUG BUDGET FETCH ---');
    const year = 2026;

    // 1. Fetch Services
    const { data: services, error: svcError } = await supabase
        .from('services')
        .select('id, name, code, department_id')
        .eq('is_active', true)
        .order('name');

    if (svcError) { console.error('Service Error:', svcError); return; }
    console.log(`Fetched ${services.length} services.`);

    // Check if Paid General is there
    const pg = services.find(s => s.name === 'Paid General');
    console.log('Service "Paid General" exists in fetch?', pg ? 'YES' : 'NO', pg ? pg.id : '');

    // 2. Fetch Budget Lines
    const { data: budgetLines, error: blError } = await supabase
        .from('budget_lines')
        .select('*')
        .eq('fiscal_year', year);

    if (blError) { console.error('Budget Lines Error:', blError); return; }
    console.log(`Fetched ${budgetLines.length} budget lines.`);

    // 3. Match
    budgetLines.forEach(line => {
        if (line.line_type === 'revenue') {
            const svc = services.find(s => s.id === line.service_id);
            if (svc) {
                if (svc.name === 'Paid General') console.log('MATCH FOUND for Paid General!', line.jan);
            } else {
                console.log('MISMATCH: Line service_id not found in services list:', line.service_id);
            }
        }
    });
}

debugBudgetFetch();
