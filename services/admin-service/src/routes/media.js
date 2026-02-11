import express from 'express';
import Joi from 'joi';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// MEDIA INVESTMENT MANAGEMENT ENDPOINTS
// ================================================

/**
 * GET /media/platforms
 * Get all available ad platforms
 */
router.get('/platforms', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ad_platforms')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch platforms', details: error.message });
        }

        res.json({ platforms: data });
    } catch (err) {
        console.error('Error fetching platforms:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /media/investment/:year/:month
 * Get investment matrix for a period
 */
router.get('/investment/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;

        // 1. Get all clients (active)
        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        if (clientsError) return res.status(500).json({ error: clientsError.message });

        // 2. Get Monthly Billing (for Planned Investment)
        const { data: billing, error: billingError } = await supabase
            .from('monthly_billing')
            .select('client_id, total_ad_investment')
            .eq('fiscal_year', parseInt(year))
            .eq('fiscal_month', parseInt(month));

        if (billingError) return res.status(500).json({ error: billingError.message });

        // 3. Get Platform Investments (Reference 'actual_amount')
        const { data: investments, error: invError } = await supabase
            .from('client_ad_investment')
            .select(`
                *,
                platform:ad_platforms(id, code, name)
            `)
            .eq('fiscal_year', parseInt(year))
            .eq('fiscal_month', parseInt(month));

        if (invError) return res.status(500).json({ error: invError.message });

        // 4. Transform structure for frontend
        const matrix = clients.map(client => {
            const clientBilling = billing.find(b => b.client_id === client.id);
            const clientInvestments = investments.filter(inv => inv.client_id === client.id);

            // Planned is now from monthly_billing (total_ad_investment)
            const plannedInvestment = parseFloat(clientBilling?.total_ad_investment || 0);

            // Actual is sum of platform spends
            const totalActual = clientInvestments.reduce((sum, inv) => sum + parseFloat(inv.actual_amount || 0), 0);

            const platforms = clientInvestments.map(inv => ({
                platform_id: inv.platform_id,
                platform_name: inv.platform?.name,
                platform_code: inv.platform?.code,
                // We mainly care about ACTUAL amount for platforms now
                actual_amount: parseFloat(inv.actual_amount || 0)
            }));

            // Completion %
            const completion = plannedInvestment > 0 ? (totalActual / plannedInvestment) * 100 : 0;

            return {
                client_id: client.id,
                client_name: client.name,
                planned_investment: plannedInvestment,
                total_actual: totalActual,
                completion_percentage: Math.round(completion),
                platforms
            };
        });

        res.json({ investments: matrix });

    } catch (err) {
        console.error('Error fetching investment matrix:', err);
        res.status(500).json({
            error: 'Failed to fetch investment matrix',
            details: err.message,
            stack: err.stack
        });
    }
});

/**
 * POST /media/planned
 * Update Planned Investment (in monthly_billing)
 */
router.post('/planned', async (req, res) => {
    try {
        const schema = Joi.object({
            client_id: Joi.string().uuid().required(),
            fiscal_year: Joi.number().required(),
            fiscal_month: Joi.number().required(),
            amount: Joi.number().min(0).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        // Upsert monthly_billing
        // Ensure we don't overwrite other fields if record exists.
        // Actually Supabase upsert will Update everything provided.
        // To only update 'investment', we should first check if it exists?
        // Or use onConflict -> do update.
        // But if we only provide 'investment', will it nullify others?
        // No, 'upsert' usually merges OR replacements. In Supabase JS, `upsert` replaces the row unless `ignoreDuplicates` is true (which prevents update).
        // If we want partial update on conflict:
        // We can't do partial upsert easily in one go if we don't know if it exists.
        // Better: Select existing, if exists Update, else Insert.

        // Check existing
        const { data: existing } = await supabase
            .from('monthly_billing')
            .select('id')
            .eq('client_id', value.client_id)
            .eq('fiscal_year', value.fiscal_year)
            .eq('fiscal_month', value.fiscal_month)
            .single();

        let result;
        if (existing) {
            result = await supabase
                .from('monthly_billing')
                .update({ total_ad_investment: value.amount })
                .eq('id', existing.id)
                .select();
        } else {
            result = await supabase
                .from('monthly_billing')
                .insert({
                    client_id: value.client_id,
                    fiscal_year: value.fiscal_year,
                    fiscal_month: value.fiscal_month,
                    total_ad_investment: value.amount
                })
                .select();
        }

        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });

    } catch (err) {
        console.error('Error saving planned investment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /media/platform
 * Update Platform Investment (in client_ad_investment)
 */
router.post('/platform', async (req, res) => {
    try {
        const schema = Joi.object({
            client_id: Joi.string().uuid().required(),
            fiscal_year: Joi.number().required(),
            fiscal_month: Joi.number().required(),
            platform_id: Joi.string().uuid().required(),
            amount: Joi.number().min(0).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        // Upsert client_ad_investment
        const { data, error: upsertError } = await supabase
            .from('client_ad_investment')
            .upsert({
                client_id: value.client_id,
                fiscal_year: value.fiscal_year,
                fiscal_month: value.fiscal_month,
                platform_id: value.platform_id,
                actual_amount: value.amount,
                // We default planned_amount to 0 or null here since we moved planning to global
            }, { onConflict: 'client_id, fiscal_year, fiscal_month, platform_id' })
            .select()
            .single();

        if (upsertError) throw upsertError;

        res.json({ success: true, data });

    } catch (err) {
        console.error('Error saving platform investment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
