import express from 'express';
import Joi from 'joi';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// PARTNER MANAGEMENT
// ================================================

/**
 * GET /partners
 * List all partners/referrers
 */
router.get('/', async (req, res) => {
    try {
        const { is_active } = req.query;

        let query = supabase
            .from('partners')
            .select(`
        *,
        clients:partner_clients(
          client:clients(id, name)
        )
      `)
            .order('name');

        if (is_active !== undefined) {
            query = query.eq('is_active', is_active === 'true');
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch partners', details: error.message });
        }

        res.json({
            success: true,
            total: data.length,
            partners: data
        });

    } catch (err) {
        console.error('Error fetching partners:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /partners
 * Create new partner
 */
router.post('/', async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            phone: Joi.string().allow(''),
            default_commission_percentage: Joi.number().min(0).max(100).default(10),
            payment_method: Joi.string().valid('bank_transfer', 'paypal', 'other').default('bank_transfer'),
            bank_details: Joi.string().allow(''),
            notes: Joi.string().allow('')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { data, error: createError } = await supabase
            .from('partners')
            .insert(value)
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ error: 'Failed to create partner', details: createError.message });
        }

        res.json({
            success: true,
            message: 'Partner created successfully',
            partner: data
        });

    } catch (err) {
        console.error('Error creating partner:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /partners/:id/clients
 * Assign client to partner (with commission %)
 */
router.post('/:id/clients', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            client_id: Joi.string().uuid().required(),
            commission_percentage: Joi.number().min(0).max(100).required(),
            effective_from: Joi.date().iso().default(() => new Date()),
            notes: Joi.string().allow('')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { data, error: assignError } = await supabase
            .from('partner_clients')
            .insert({
                partner_id: id,
                ...value
            })
            .select()
            .single();

        if (assignError) {
            return res.status(500).json({ error: 'Failed to assign client', details: assignError.message });
        }

        res.json({
            success: true,
            message: 'Client assigned to partner successfully',
            assignment: data
        });

    } catch (err) {
        console.error('Error assigning client:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================================================
// PARTNER COMMISSIONS (PAID)
// ================================================

/**
 * POST /partners/commissions/calculate
 * Calculate commissions for all partners for a period
 */
router.post('/commissions/calculate', async (req, res) => {
    try {
        const schema = Joi.object({
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required(),
            save: Joi.boolean().default(false)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { fiscal_year, fiscal_month, save } = value;

        // Get all active partner-client assignments
        const { data: assignments } = await supabase
            .from('partner_clients')
            .select(`
        *,
        partner:partners(id, name),
        client:clients(id, name)
      `)
            .eq('is_active', true);

        if (!assignments || assignments.length === 0) {
            return res.json({
                success: true,
                message: 'No active partner assignments found',
                commissions: []
            });
        }

        const calculations = [];

        // For each assignment, calculate commission
        for (const assignment of assignments) {
            // Get client revenue for this period
            const { data: billing } = await supabase
                .from('monthly_billing')
                .select('immedia_total, imcontent_total, immoralia_total, immoral_general_total')
                .eq('client_id', assignment.client_id)
                .eq('fiscal_year', fiscal_year)
                .eq('fiscal_month', fiscal_month)
                .single();

            if (billing) {
                const clientRevenue =
                    (billing.immedia_total || 0) +
                    (billing.imcontent_total || 0) +
                    (billing.immoralia_total || 0) +
                    (billing.immoral_general_total || 0);

                const commissionAmount = clientRevenue * assignment.commission_percentage / 100;

                calculations.push({
                    partner_id: assignment.partner_id,
                    partner_name: assignment.partner?.name,
                    client_id: assignment.client_id,
                    client_name: assignment.client?.name,
                    client_revenue: clientRevenue,
                    commission_percentage: assignment.commission_percentage,
                    commission_amount: commissionAmount
                });

                // Save if requested
                if (save && commissionAmount > 0) {
                    await supabase
                        .from('monthly_partner_commissions')
                        .insert({
                            partner_id: assignment.partner_id,
                            client_id: assignment.client_id,
                            fiscal_year,
                            fiscal_month,
                            client_revenue: clientRevenue,
                            commission_percentage: assignment.commission_percentage,
                            commission_amount: commissionAmount,
                            payment_status: 'pending'
                        })
                        .select();
                }
            }
        }

        const totalCommissions = calculations.reduce((sum, c) => sum + c.commission_amount, 0);

        res.json({
            success: true,
            saved: save,
            period: { fiscal_year, fiscal_month },
            total_commissions: totalCommissions,
            commissions: calculations,
            note: save ? 'Commissions saved as pending' : 'Preview only - set save:true to save'
        });

    } catch (err) {
        console.error('Error calculating commissions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /partners/commissions/:year/:month
 * Get partner commissions for a period
 */
router.get('/commissions/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const { partner_id, payment_status } = req.query;

        let query = supabase
            .from('monthly_partner_commissions')
            .select(`
        *,
        partner:partners(name, email, payment_method),
        client:clients(name)
      `)
            .eq('fiscal_year', parseInt(year))
            .eq('fiscal_month', parseInt(month))
            .order('created_at');

        if (partner_id) {
            query = query.eq('partner_id', partner_id);
        }

        if (payment_status) {
            query = query.eq('payment_status', payment_status);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch commissions', details: error.message });
        }

        const total = data.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
        const byPartner = data.reduce((acc, c) => {
            const partner = c.partner?.name || 'Unknown';
            if (!acc[partner]) acc[partner] = 0;
            acc[partner] += parseFloat(c.commission_amount || 0);
            return acc;
        }, {});

        res.json({
            success: true,
            period: { year: parseInt(year), month: parseInt(month) },
            total_commissions: total,
            by_partner: byPartner,
            commissions: data
        });

    } catch (err) {
        console.error('Error fetching commissions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /partners/commissions/:id
 * Edit commission manually (Excel flexibility)
 */
router.patch('/commissions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            commission_percentage: Joi.number().min(0).max(100),
            commission_amount: Joi.number().min(0),
            payment_status: Joi.string().valid('pending', 'paid', 'cancelled'),
            payment_date: Joi.date().iso().allow(null),
            notes: Joi.string().allow('')
        }).min(1);

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { data, error: updateError } = await supabase
            .from('monthly_partner_commissions')
            .update(value)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update commission', details: updateError.message });
        }

        res.json({
            success: true,
            message: 'Commission updated successfully',
            commission: data
        });

    } catch (err) {
        console.error('Error updating commission:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /partners/commissions/:id/pay
 * Mark commission as paid
 */
router.post('/commissions/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            payment_date: Joi.date().iso().default(() => new Date()),
            payment_reference: Joi.string().allow('')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { data, error: updateError } = await supabase
            .from('monthly_partner_commissions')
            .update({
                payment_status: 'paid',
                payment_date: value.payment_date,
                notes: value.payment_reference ? `Paid - Ref: ${value.payment_reference}` : 'Paid'
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: 'Failed to mark as paid', details: updateError.message });
        }

        res.json({
            success: true,
            message: 'Commission marked as paid',
            commission: data
        });

    } catch (err) {
        console.error('Error marking commission as paid:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
