import supabase from '../src/config/supabase.js';

async function testFullQuery() {
    console.log('Testing Full Join Query...');

    const year = 2026;
    const month = 2;

    const { data: investments, error: invError } = await supabase
        .from('client_ad_investment')
        .select(`
            *,
            platform:ad_platforms(id, code, name)
        `)
        .eq('fiscal_year', year)
        .eq('fiscal_month', month);

    if (invError) {
        console.error('FAILED:', invError);
    } else {
        console.log(`SUCCESS. Found ${investments.length} records.`);
        if (investments.length > 0) {
            console.log('Sample:', JSON.stringify(investments[0], null, 2));
        }
    }
}

testFullQuery();
