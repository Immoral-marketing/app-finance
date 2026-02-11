import express from 'express';
import Joi from 'joi';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// PAYROLL ENDPOINTS
// ================================================

/**
 * POST /payroll
 * Create monthly payroll for an employee
 */
router.post('/', async (req, res) => {
    try {
        const schema = Joi.object({
            employee_id: Joi.string().uuid().required(),
            fiscal_year: Joi.number().integer().min(2020).required(),
            fiscal_month: Joi.number().integer().min(1).max(12).required(),
            gross_salary: Joi.number().min(0).required(),
            social_security_company: Joi.number().min(0).default(0),
            other_benefits: Joi.number().min(0).default(0),
            total_company_cost: Joi.number().min(0).required(),
            payment_date: Joi.date().iso().required(),
            notes: Joi.string().allow(''),
            auto_split: Joi.boolean().default(true) // Auto-calculate department splits
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
            return res.status(403).json({ error: 'Cannot add payroll to closed period' });
        }

        // Create payroll
        const { data: payroll, error: createError } = await supabase
            .from('monthly_payroll')
            .insert({
                employee_id: value.employee_id,
                fiscal_year: value.fiscal_year,
                fiscal_month: value.fiscal_month,
                gross_salary: value.gross_salary,
                social_security_company: value.social_security_company,
                other_benefits: value.other_benefits,
                total_company_cost: value.total_company_cost,
                payment_date: value.payment_date,
                notes: value.notes
            })
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ error: 'Failed to create payroll', details: createError.message });
        }

        // Auto-calculate splits if requested
        let splits = null;
        if (value.auto_split) {
            const { data: splitData, error: splitError } = await supabase.rpc(
                'split_payroll_by_departments',
                {
                    p_payroll_id: payroll.id,
                    p_dry_run: false // Execute splits
                }
            );

            if (!splitError) {
                splits = splitData;
            }
        }

        res.json({
            success: true,
            message: 'Payroll created successfully',
            payroll,
            department_splits: splits,
            note: 'Department splits calculated automatically. Can be edited manually if needed.'
        });

    } catch (err) {
        console.error('Error creating payroll:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /payroll/:year/:month
 * Get all payrolls for a period
 */
router.get('/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const { department_id } = req.query;

        let query = supabase
            .from('monthly_payroll')
            .select(`
        *,
        employee:employees(
          employee_code,
          first_name,
          last_name,
          position,
          department:departments(name, code)
        ),
        splits:payroll_department_splits(
          department:departments(name, code),
          split_amount,
          split_percentage
        )
      `)
            .eq('fiscal_year', parseInt(year))
            .eq('fiscal_month', parseInt(month))
            .order('payment_date');

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch payroll', details: error.message });
        }

        // Calculate totals
        const totals = {
            gross_salary: data.reduce((sum, p) => sum + parseFloat(p.gross_salary || 0), 0),
            total_company_cost: data.reduce((sum, p) => sum + parseFloat(p.total_company_cost || 0), 0),
            count: data.length
        };

        // Group by department if needed
        const byDepartment = {};
        data.forEach(payroll => {
            payroll.splits?.forEach(split => {
                const dept = split.department?.name || 'Unknown';
                if (!byDepartment[dept]) {
                    byDepartment[dept] = { total: 0, count: 0 };
                }
                byDepartment[dept].total += parseFloat(split.split_amount || 0);
                byDepartment[dept].count += 1;
            });
        });

        res.json({
            success: true,
            period: { year: parseInt(year), month: parseInt(month) },
            totals,
            by_department: byDepartment,
            payrolls: data
        });

    } catch (err) {
        console.error('Error fetching payroll:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /payroll/:id
 * Update payroll (manual edit)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            gross_salary: Joi.number().min(0),
            social_security_company: Joi.number().min(0),
            other_benefits: Joi.number().min(0),
            total_company_cost: Joi.number().min(0),
            payment_date: Joi.date().iso(),
            notes: Joi.string().allow('')
        }).min(1);

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Check period not closed
        const { data: payroll } = await supabase
            .from('monthly_payroll')
            .select('fiscal_year, fiscal_month')
            .eq('id', id)
            .single();

        if (payroll) {
            const { data: isClosed } = await supabase.rpc('is_period_closed', {
                p_fiscal_year: payroll.fiscal_year,
                p_fiscal_month: payroll.fiscal_month
            });

            if (isClosed) {
                return res.status(403).json({ error: 'Cannot edit payroll in closed period' });
            }
        }

        const { data, error: updateError } = await supabase
            .from('monthly_payroll')
            .update(value)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update payroll', details: updateError.message });
        }

        res.json({
            success: true,
            message: 'Payroll updated successfully',
            payroll: data
        });

    } catch (err) {
        console.error('Error updating payroll:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /payroll/:id/splits
 * Manually set department splits
 */
router.post('/:id/splits', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            splits: Joi.array().items(
                Joi.object({
                    department_id: Joi.string().uuid().required(),
                    split_percentage: Joi.number().min(0).max(100).required()
                })
            ).required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Validate splits sum to 100%
        const totalPct = value.splits.reduce((sum, s) => sum + s.split_percentage, 0);
        if (Math.abs(totalPct - 100) > 0.01) {
            return res.status(400).json({ error: `Splits must sum to 100% (current: ${totalPct}%)` });
        }

        // Get payroll info
        const { data: payroll, error: payrollError } = await supabase
            .from('monthly_payroll')
            .select('total_company_cost, fiscal_year, fiscal_month')
            .eq('id', id)
            .single();

        if (payrollError) {
            return res.status(404).json({ error: 'Payroll not found' });
        }

        // Check period not closed
        const { data: isClosed } = await supabase.rpc('is_period_closed', {
            p_fiscal_year: payroll.fiscal_year,
            p_fiscal_month: payroll.fiscal_month
        });

        if (isClosed) {
            return res.status(403).json({ error: 'Cannot edit splits in closed period' });
        }

        // Delete existing splits
        await supabase
            .from('payroll_department_splits')
            .delete()
            .eq('payroll_id', id);

        // Insert new splits
        const newSplits = value.splits.map(split => ({
            payroll_id: id,
            department_id: split.department_id,
            split_percentage: split.split_percentage,
            split_amount: payroll.total_company_cost * split.split_percentage / 100
        }));

        const { data, error: insertError } = await supabase
            .from('payroll_department_splits')
            .insert(newSplits)
            .select();

        if (insertError) {
            return res.status(500).json({ error: 'Failed to create splits', details: insertError.message });
        }

        res.json({
            success: true,
            message: 'Department splits updated successfully',
            splits: data
        });

    } catch (err) {
        console.error('Error updating splits:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
