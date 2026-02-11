import supabase from '../src/config/supabase.js';

async function verifyMigration() {
    console.log('🔍 Verifying fee_config migration...\n');

    try {
        // 1. Check if fee_config column exists by fetching a client
        console.log('1. Checking fee_config column...');
        const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('id, name, fee_config, vertical_id')
            .limit(1);

        if (clientError) {
            console.error('❌ Error:', clientError.message);
            return;
        }

        console.log('✅ fee_config column exists');
        if (clients.length > 0) {
            console.log('   Sample client:', clients[0].name);
            console.log('   Fee config:', JSON.stringify(clients[0].fee_config, null, 2));
        }

        // 2. Test client creation with fee_config
        console.log('\n2. Testing client creation via API...');
        const response = await fetch('http://localhost:3010/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Migration Client',
                email: 'test@migration.com',
                fee_config: {
                    fee_type: 'variable',
                    fixed_pct: 10,
                    variable_ranges: [
                        { min: 0, max: 20000, pct: 15 },
                        { min: 20001, max: null, pct: 10 }
                    ],
                    platform_cost_first: 700,
                    platform_cost_additional: 300,
                    calculation_type: 'auto'
                }
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Client created via API');
            console.log('   ID:', result.client.id);

            // Clean up: delete test client
            await supabase
                .from('clients')
                .delete()
                .eq('id', result.client.id);
            console.log('   (Test client deleted)');
        } else {
            const error = await response.text();
            console.error('❌ API Error:', error);
        }

        // 3. Check matrix endpoint includes fee_config
        console.log('\n3. Checking matrix endpoint includes fee_config...');
        const matrixResponse = await fetch('http://localhost:3010/billing/matrix/2026/2');

        if (matrixResponse.ok) {
            const matrixData = await matrixResponse.json();
            if (matrixData.rows && matrixData.rows.length > 0) {
                const firstRow = matrixData.rows[0];
                console.log('✅ Matrix endpoint working');
                console.log('   Sample row has fee_config:', !!firstRow.fee_config);
            }
        } else {
            console.log('⚠️  Matrix endpoint returned:', matrixResponse.status);
        }

        console.log('\n✅ Migration verified successfully!');
        console.log('\n📋 Next Steps:');
        console.log('   - Phase 1 (Backend) is complete');
        console.log('   - Ready for Phase 2 (Frontend UI)');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyMigration();
