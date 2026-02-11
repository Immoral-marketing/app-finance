import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Get Payment Schedule for a specific month
router.get('/schedule/:year/:month', async (req, res) => {
    const { year, month } = req.params;

    const { data, error } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('fiscal_year', year)
        .eq('fiscal_month', month)
        .order('due_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ payments: data });
});

// Create a new Payment
router.post('/', async (req, res) => {
    const {
        fiscal_year,
        fiscal_month,
        payment_concept,
        payee_name,
        total_amount,
        due_date,
        issuing_company_id
    } = req.body;

    const { data, error } = await supabase
        .from('payment_schedule')
        .insert({
            fiscal_year,
            fiscal_month,
            payment_concept,
            payee_name,
            total_amount,
            due_date,
            issuing_company_id,
            status: 'pending'
        })
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, payment: data[0] });
});

// Update Payment Status
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, payment_date } = req.body;

    const updateData = { status };
    if (status === 'paid' && payment_date) {
        updateData.payment_date = payment_date;
    }

    const { data, error } = await supabase
        .from('payment_schedule')
        .update(updateData)
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, payment: data[0] });
});

export default router;
