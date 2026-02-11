import express from 'express';
import Joi from 'joi';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// PERIOD MANAGEMENT ENDPOINTS (Admin only)
// ================================================

/**
 * POST /periods/close
 * Close a financial period (Admin only)
 */
router.post('/close', async (req, res) => {
    try {
        const schema = Joi.object({
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required(),
            closed_by: Joi.string().uuid().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { fiscal_year, fiscal_month, closed_by } = value;

        // Call close period function
        const { data, error: closeError } = await supabase.rpc(
            'close_financial_period',
            {
                p_fiscal_year: fiscal_year,
                p_fiscal_month: fiscal_month,
                p_closed_by: closed_by
            }
        );

        if (closeError) {
            return res.status(500).json({ error: 'Failed to close period', details: closeError.message });
        }

        res.json({
            success: true,
            message: `Period ${fiscal_year}-${String(fiscal_month).padStart(2, '0')} closed successfully`,
            period: { fiscal_year, fiscal_month },
            closed_at: new Date().toISOString(),
            note: 'Period is now locked. Only admin can reopen it.'
        });

    } catch (err) {
        console.error('Error closing period:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /periods/reopen
 * Reopen a financial period (Admin only)
 */
router.post('/reopen', async (req, res) => {
    try {
        const schema = Joi.object({
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required(),
            reopened_by: Joi.string().uuid().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { fiscal_year, fiscal_month, reopened_by } = value;

        // Call reopen period function
        const { data, error: reopenError } = await supabase.rpc(
            'reopen_financial_period',
            {
                p_fiscal_year: fiscal_year,
                p_fiscal_month: fiscal_month,
                p_reopened_by: reopened_by
            }
        );

        if (reopenError) {
            return res.status(500).json({ error: 'Failed to reopen period', details: reopenError.message });
        }

        if (!data) {
            return res.status(404).json({ error: 'Period not found or already open' });
        }

        res.json({
            success: true,
            message: `Period ${fiscal_year}-${String(fiscal_month).padStart(2, '0')} reopened successfully`,
            period: { fiscal_year, fiscal_month },
            reopened_at: new Date().toISOString(),
            note: 'Period is now editable again.'
        });

    } catch (err) {
        console.error('Error reopening period:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /periods/:year/:month/status
 * Check if period is closed
 */
router.get('/:year/:month/status', async (req, res) => {
    try {
        const { year, month } = req.params;

        const { data: isClosed, error: checkError } = await supabase.rpc(
            'is_period_closed',
            {
                p_fiscal_year: parseInt(year),
                p_fiscal_month: parseInt(month)
            }
        );

        if (checkError) {
            return res.status(500).json({ error: 'Failed to check period status', details: checkError.message });
        }

        // Get period details
        const { data: period } = await supabase
            .from('financial_periods')
            .select('*')
            .eq('fiscal_year', parseInt(year))
            .eq('fiscal_month', parseInt(month))
            .single();

        res.json({
            success: true,
            period: {
                fiscal_year: parseInt(year),
                fiscal_month: parseInt(month)
            },
            is_closed: isClosed || false,
            details: period,
            editable: !isClosed
        });

    } catch (err) {
        console.error('Error checking period status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /periods
 * List all periods
 */
router.get('/', async (req, res) => {
    try {
        const { data, error: fetchError } = await supabase
            .from('financial_periods')
            .select('*')
            .order('fiscal_year', { ascending: false })
            .order('fiscal_month', { ascending: false });

        if (fetchError) {
            return res.status(500).json({ error: 'Failed to fetch periods', details: fetchError.message });
        }

        res.json({
            success: true,
            total: data.length,
            periods: data
        });

    } catch (err) {
        console.error('Error fetching periods:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
