import supabase from '../src/config/supabase.js';

/**
 * Test script to verify client CRUD operations and fee_config functionality
 */

async function testClientCRUD() {
    console.log('🧪 Testing Client CRUD Operations\n');

    try {
        // 1. Create a test client with custom fee_config
        console.log('1. Creating test client with variable fee config...');
        const { data: newClient, error: createError } = await supabase
            .from('clients')
            .insert({
                name: 'Test Client - Variable Fee',
                email: 'test@example.com',
                fee_config: {
                    fee_type: 'variable',
                    fixed_pct: 10,
                    variable_ranges: [
                        { min: 0, max: 10000, pct: 15 },
                        { min: 10001, max: 50000, pct: 12 },
                        { min: 50001, max: null, pct: 10 }
                    ],
                    platform_cost_first: 700,
                    platform_cost_additional: 250,
                    calculation_type: 'auto'
                }
            })
            .select()
            .single();

        if (createError) throw createError;
        console.log('✅ Client created:', newClient.id);
        console.log('   Fee Config:', JSON.stringify(newClient.fee_config, null, 2));

        // 2. Fetch the client
        console.log('\n2. Fetching client...');
        const { data: fetchedClient, error: fetchError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', newClient.id)
            .single();

        if (fetchError) throw fetchError;
        console.log('✅ Client fetched successfully');

        // 3. Update the client
        console.log('\n3. Updating client fee config...');
        const { data: updatedClient, error: updateError } = await supabase
            .from('clients')
            .update({
                fee_config: {
                    ...fetchedClient.fee_config,
                    platform_cost_additional: 300
                }
            })
            .eq('id', newClient.id)
            .select()
            .single();

        if (updateError) throw updateError;
        console.log('✅ Client updated. New platform cost:', updatedClient.fee_config.platform_cost_additional);

        // 4. Test variable fee calculation logic
        console.log('\n4. Testing fee calculation ranges...');
        const testInvestments = [5000, 25000, 75000];

        testInvestments.forEach(inv => {
            const range = updatedClient.fee_config.variable_ranges.find(r =>
                inv >= (r.min || 0) && (r.max === null || inv <= r.max)
            );
            const feePct = range ? range.pct : updatedClient.fee_config.fixed_pct;
            const platformCost = updatedClient.fee_config.platform_cost_first +
                (Math.max(0, 2 - 1) * updatedClient.fee_config.platform_cost_additional);
            const paidMedia = (inv * (feePct / 100)) + platformCost;

            console.log(`   Investment: €${inv.toLocaleString()}`);
            console.log(`   → Fee: ${feePct}% | Platform Cost: €${platformCost} | Paid Media: €${paidMedia.toFixed(2)}`);
        });

        // 5. Delete (soft delete)
        console.log('\n5. Soft deleting client...');
        const { error: deleteError } = await supabase
            .from('clients')
            .update({ is_active: false })
            .eq('id', newClient.id);

        if (deleteError) throw deleteError;
        console.log('✅ Client soft deleted');

        // Verify it's not in active list
        const { data: activeClients } = await supabase
            .from('clients')
            .select('id')
            .eq('is_active', true)
            .eq('id', newClient.id);

        console.log(`   Active clients with this ID: ${activeClients.length} (should be 0)`);

        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

testClientCRUD();
