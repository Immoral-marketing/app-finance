import express from 'express';
import Joi from 'joi';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// EMPLOYEE ENDPOINTS
// ================================================

/**
 * GET /employees
 * List all employees
 */
router.get('/', async (req, res) => {
    try {
        const { is_active, department_id } = req.query;

        let query = supabase
            .from('employees')
            .select(`
        *,
        department:departments(id, name, code)
      `)
            .order('last_name');

        if (is_active !== undefined) {
            query = query.eq('is_active', is_active === 'true');
        }

        if (department_id) {
            query = query.eq('primary_department_id', department_id);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
        }

        res.json({
            success: true,
            total: data.length,
            employees: data
        });

    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /employees/:id
 * Get employee details with salary history
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: employee, error } = await supabase
            .from('employees')
            .select(`
        *,
        department:departments(id, name, code),
        salary_history(
          old_salary,
          new_salary,
          effective_from,
          effective_to,
          change_reason
        )
      `)
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({
            success: true,
            employee
        });

    } catch (err) {
        console.error('Error fetching employee:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /employees
 * Create new employee
 */
router.post('/', async (req, res) => {
    try {
        const schema = Joi.object({
            employee_code: Joi.string().required(),
            first_name: Joi.string().required(),
            last_name: Joi.string().required(),
            email: Joi.string().email().required(),
            hire_date: Joi.date().iso().required(),
            current_salary: Joi.number().min(0).required(),
            position: Joi.string().required(),
            primary_department_id: Joi.string().uuid().required(),
            is_active: Joi.boolean().default(true)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Create employee
        const { data: employee, error: createError } = await supabase
            .from('employees')
            .insert(value)
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ error: 'Failed to create employee', details: createError.message });
        }

        // Create initial salary history
        await supabase
            .from('salary_history')
            .insert({
                employee_id: employee.id,
                old_salary: null,
                new_salary: value.current_salary,
                effective_from: value.hire_date,
                change_reason: 'Initial salary'
            });

        res.json({
            success: true,
            message: 'Employee created successfully',
            employee
        });

    } catch (err) {
        console.error('Error creating employee:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /employees/:id/salary
 * Update employee salary (creates history)
 */
router.patch('/:id/salary', async (req, res) => {
    try {
        const { id } = req.params;

        const schema = Joi.object({
            new_salary: Joi.number().min(0).required(),
            effective_from: Joi.date().iso().required(),
            change_reason: Joi.string().required(),
            approved_by: Joi.string().uuid().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Call SQL function to update salary with history
        const { data, error: updateError } = await supabase.rpc(
            'update_employee_salary',
            {
                p_employee_id: id,
                p_new_salary: value.new_salary,
                p_effective_from: value.effective_from,
                p_change_reason: value.change_reason,
                p_approved_by: value.approved_by
            }
        );

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update salary', details: updateError.message });
        }

        res.json({
            success: true,
            message: 'Salary updated successfully',
            note: 'Salary history has been recorded'
        });

    } catch (err) {
        console.error('Error updating salary:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
