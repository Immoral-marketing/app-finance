import express from 'express';
import Joi from 'joi';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// PLATFORM COMMISSIONS (EARNED)
// ================================================

/**
 * GET /platforms
 * List commission platforms (WillMay, etc.)
 */
router.get('/', async (req, res) => {
    try {
        const { is_active } = req.query;

        let query = supabase
            .from('commission_platforms')
            .select('*')
            .order('name');

        if (is_active !== undefined) {
            query = query.eq('is_active', is_active === 'true');
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch platforms', details: error.message });
        }

        res.json({
            success: true,
            total: data.length,
            platforms: data
        });

    } catch (err) {
        console.error('Error fetching platforms:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /platforms
 * Add new commission platform
 */
router.post('/', async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().required(),
            platform_type: Joi.string().required(),
            default_commission_percentage: Joi.number().min(0).max(100).default(5),
            payment_frequency: Joi.string().valid('monthly', 'quarterly', 'annual').default('monthly'),
            contact_email: Joi.string().email().allow(''),
            notes: Joi.string().allow('')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { data, error: createError } = await supabase
            .from('commission_platforms')
            .insert(value)
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ error: 'Failed to create platform', details: createError.message });
        }

        res.json({
            success: true,
            message: 'Platform created successfully',
            platform: data
        });

    } catch (err) {
        console.error('Error creating platform:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /platforms/commissions
 * Register commission earned from platform
 */
router.post('/commissions', async (req, res) => {
    try {
        const schema = Joi.object({
            platform_id: Joi.string().uuid().required(),
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required(),
            total_client_spending: Joi.number().min(0).required(),
            commission_percentage: Joi.number().min(0).max(100).required(),
            commission_earned: Joi.number().min(0).required(),
            payment_status: Joi.string().valid('pending', 'received', 'cancelled').default('pending'),
            notes: Joi.string().allow('')
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { data, error: createError } = await supabase
            .from('monthly_platform_commissions')
            .insert(value)
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ error: 'Failed to register commission', details: createError.message });
        }

        res.json({
            success: true,
            message: 'Commission registered successfully',
            commission: data
        });

    } catch (err) {
        console.error('Error registering commission:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /platforms/commissions/:year/:month
 * Get platform commissions for a period
 */
router.get('/commissions/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const { platform_id, payment_status } = req.query;

        let query = supabase
            .from('monthly_platform_commissions')
            .select(`
        *,
        platform:commission_platforms(name, platform_type, contact_email)
      `)
            .eq('fiscal_year', parseInt(year))
            .eq('fiscal_month', parseInt(month))
            .order('created_at');

        if (platform_id) {
            query = query.eq('platform_id', platform_id);
        }

        if (payment_status) {
            query = query.eq('payment_status', payment_status);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch commissions', details: error.message });
        }

        const total = data.reduce((sum, c) => sum + parseFloat(c.commission_earned || 0), 0);
        const byPlatform = data.reduce((acc, c) => {
            const platform = c.platform?.name || 'Unknown';
            if (!acc[platform]) acc[platform] = 0;
            acc[platform] += parseFloat(c.commission_earned || 0);
            return acc;
        }, {});

        res.json({
            success: true,
            period: { year: parseInt(year), month: parseInt(month) },
            total_earned: total,
            by_platform: byPlatform,
            commissions: data
        });

    } catch (err) {
        console.error('Error fetching commissions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /platforms/commissions/:id
 * Edit platform commission manually
 */
router.patch('/commissions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            total_client_spending: Joi.number().min(0),
            commission_percentage: Joi.number().min(0).max(100),
            commission_earned: Joi.number().min(0),
            payment_status: Joi.string().valid('pending', 'received', 'cancelled'),
            payment_date: Joi.date().iso().allow(null),
            notes: Joi.string().allow('')
        }).min(1);

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { data, error: updateError } = await supabase
            .from('monthly_platform_commissions')
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
 * POST /platforms/commissions/:id/receive
 * Mark commission as received
 */
router.post('/commissions/:id/receive', async (req, res) => {
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
            .from('monthly_platform_commissions')
            .update({
                payment_status: 'received',
                payment_date: value.payment_date,
                notes: value.payment_reference ? `Received - Ref: ${value.payment_reference}` : 'Received'
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: 'Failed to mark as received', details: updateError.message });
        }

        res.json({
            success: true,
            message: 'Commission marked as received',
            commission: data
        });

    } catch (err) {
        console.error('Error marking commission as received:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
