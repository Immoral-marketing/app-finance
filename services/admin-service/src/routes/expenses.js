import express from 'express';
import Joi from 'joi';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// EXPENSE MANAGEMENT ENDPOINTS
// ================================================

/**
 * POST /expenses/prorate-preview
 * Preview expense proration without saving
 */
router.post('/prorate-preview', async (req, res) => {
    try {
        const schema = Joi.object({
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { fiscal_year, fiscal_month } = value;

        // Call proration function with dry_run=true
        const { data, error: prorationError } = await supabase.rpc(
            'prorate_general_expenses',
            {
                p_fiscal_year: fiscal_year,
                p_fiscal_month: fiscal_month,
                p_dry_run: true
            }
        );

        if (prorationError) {
            return res.status(500).json({ error: 'Failed to calculate proration', details: prorationError.message });
        }

        const totalProrated = data.reduce((sum, dept) => sum + parseFloat(dept.prorated_amount || 0), 0);

        res.json({
            success: true,
            preview: true,
            period: { fiscal_year, fiscal_month },
            total_general_expenses: data[0]?.total_general_expenses || 0,
            total_prorated: totalProrated,
            by_department: data,
            note: 'This is a preview. Use POST /expenses/prorate-execute to apply these allocations.'
        });

    } catch (err) {
        console.error('Error in proration preview:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /expenses/prorate-execute
 * Execute expense proration
 */
router.post('/prorate-execute', async (req, res) => {
    try {
        const schema = Joi.object({
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { fiscal_year, fiscal_month } = value;

        // Check period not closed
        const { data: isClosed } = await supabase.rpc('is_period_closed', {
            p_fiscal_year: fiscal_year,
            p_fiscal_month: fiscal_month
        });

        if (isClosed) {
            return res.status(403).json({ error: 'Cannot prorate expenses for closed period' });
        }

        // Execute proration
        const { data, error: prorationError } = await supabase.rpc(
            'prorate_general_expenses',
            {
                p_fiscal_year: fiscal_year,
                p_fiscal_month: fiscal_month,
                p_dry_run: false
            }
        );

        if (prorationError) {
            return res.status(500).json({ error: 'Failed to execute proration', details: prorationError.message });
        }

        res.json({
            success: true,
            message: 'Expenses prorated successfully',
            period: { fiscal_year, fiscal_month },
            allocations: data,
            note: 'Prorated expenses can still be edited manually if needed'
        });

    } catch (err) {
        console.error('Error executing proration:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /expenses
 * Add expense manually
 */
router.post('/', async (req, res) => {
    try {
        const schema = Joi.object({
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required(),
            department_id: Joi.string().uuid().required(),
            expense_category_id: Joi.string().uuid().required(),
            amount: Joi.number().min(0).required(),
            description: Joi.string().required(),
            payment_date: Joi.date().iso(),
            vendor: Joi.string().allow(''),
            invoice_number: Joi.string().allow(''),
            reference_type: Joi.string().allow(''),
            reference_id: Joi.string().uuid().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Check period not closed
        const { data: isClosed } = await supabase.rpc('is_period_closed', {
            p_fiscal_year: value.fiscal_year,
            p_fiscal_month: value.fiscal_month
        });

        if (isClosed) {
            return res.status(403).json({ error: 'Cannot add expenses to closed period' });
        }

        const { data, error: insertError } = await supabase
            .from('actual_expenses')
            .insert(value)
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: 'Failed to add expense', details: insertError.message });
        }

        res.json({
            success: true,
            message: 'Expense added successfully',
            expense: data
        });

    } catch (err) {
        console.error('Error adding expense:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /expenses/:id
 * Edit expense manually (FULL FLEXIBILITY)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            amount: Joi.number().min(0),
            description: Joi.string(),
            payment_date: Joi.date().iso(),
            vendor: Joi.string().allow(''),
            invoice_number: Joi.string().allow('')
        }).min(1);

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Check expense exists and period not closed
        const { data: expense } = await supabase
            .from('actual_expenses')
            .select('fiscal_year, fiscal_month')
            .eq('id', id)
            .single();

        if (expense) {
            const { data: isClosed } = await supabase.rpc('is_period_closed', {
                p_fiscal_year: expense.fiscal_year,
                p_fiscal_month: expense.fiscal_month
            });

            if (isClosed) {
                return res.status(403).json({ error: 'Cannot edit expenses in closed period' });
            }
        }

        const { data, error: updateError } = await supabase
            .from('actual_expenses')
            .update(value)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update expense', details: updateError.message });
        }

        res.json({
            success: true,
            message: 'Expense updated successfully',
            expense: data
        });

    } catch (err) {
        console.error('Error updating expense:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /expenses/:year/:month
 * Get all expenses for a period
 */
router.get('/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const department_id = req.query.department_id;

        let query = supabase
            .from('actual_expenses')
            .select(`
        *,
        department:departments(name, code),
        category:expense_categories(name, code, is_general)
      `)
            .eq('fiscal_year', parseInt(year))
            .eq('fiscal_month', parseInt(month))
            .order('created_at', { ascending: false });

        if (department_id) {
            query = query.eq('department_id', department_id);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            return res.status(500).json({ error: 'Failed to fetch expenses', details: fetchError.message });
        }

        // Calculate totals
        const total = data.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
        const byDepartment = data.reduce((acc, exp) => {
            const dept = exp.department?.name || 'Unknown';
            acc[dept] = (acc[dept] || 0) + parseFloat(exp.amount || 0);
            return acc;
        }, {});

        const byCategory = data.reduce((acc, exp) => {
            const cat = exp.category?.name || 'Unknown';
            acc[cat] = (acc[cat] || 0) + parseFloat(exp.amount || 0);
            return acc;
        }, {});

        res.json({
            success: true,
            period: { year: parseInt(year), month: parseInt(month) },
            total_expenses: total,
            expense_count: data.length,
            by_department: byDepartment,
            by_category: byCategory,
            expenses: data
        });

    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /expenses/:id
 * Delete expense
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check period not closed
        const { data: expense } = await supabase
            .from('actual_expenses')
            .select('fiscal_year, fiscal_month')
            .eq('id', id)
            .single();

        if (expense) {
            const { data: isClosed } = await supabase.rpc('is_period_closed', {
                p_fiscal_year: expense.fiscal_year,
                p_fiscal_month: expense.fiscal_month
            });

            if (isClosed) {
                return res.status(403).json({ error: 'Cannot delete expenses from closed period' });
            }
        }

        const { error: deleteError } = await supabase
            .from('actual_expenses')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return res.status(500).json({ error: 'Failed to delete expense', details: deleteError.message });
        }

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting expense:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
