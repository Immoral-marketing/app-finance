import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Get Fee Tiers for a specific client
router.get('/client/:clientId', async (req, res) => {
    const { clientId } = req.params;

    const { data, error } = await supabase
        .from('client_fee_tiers')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('min_investment', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ tiers: data });
});

// Update or Create Fee Tiers (Batch)
router.post('/client/:clientId', async (req, res) => {
    const { clientId } = req.params;
    const { tiers } = req.body; // Array of tiers

    // 1. Deactivate old active tiers
    const { error: deactivateError } = await supabase
        .from('client_fee_tiers')
        .update({ is_active: false, effective_to: new Date() })
        .eq('client_id', clientId)
        .eq('is_active', true);

    if (deactivateError) return res.status(500).json({ error: deactivateError.message });

    // 2. Insert new tiers
    const newTiers = tiers.map(t => ({
        client_id: clientId,
        min_investment: t.min_investment,
        max_investment: t.max_investment,
        fee_percentage: t.fee_percentage,
        fixed_cost: t.fixed_cost || 0,
        is_active: true
    }));

    const { data, error } = await supabase
        .from('client_fee_tiers')
        .insert(newTiers)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, tiers: data });
});

// Get Platform Cost Rules
router.get('/platform-costs', async (req, res) => {
    const { data, error } = await supabase
        .from('platform_cost_rules')
        .select('*')
        .order('platform_count', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ rules: data });
});

// Update Platform Cost Rules
router.post('/platform-costs', async (req, res) => {
    const { platform_count, cost_amount } = req.body;

    const { data, error } = await supabase
        .from('platform_cost_rules')
        .upsert({ platform_count, cost_amount }, { onConflict: 'platform_count' })
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, rule: data[0] });
});

export default router;
