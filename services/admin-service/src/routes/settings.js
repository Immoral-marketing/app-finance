import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// === VERTICALS ===

// GET /settings/verticals
router.get('/verticals', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('verticals')
            .select('*')
            .order('name');

        if (error) throw error;
        res.json({ verticals: data });
    } catch (error) {
        console.error('Error fetching verticals:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /settings/verticals
router.post('/verticals', async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const { data, error } = await supabase
            .from('verticals')
            .insert({
                name,
                code: code || name.toUpperCase().substring(0, 3)
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ vertical: data });
    } catch (error) {
        console.error('Error creating vertical:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /settings/verticals/:id
router.put('/verticals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;

        const { data, error } = await supabase
            .from('verticals')
            .update({ name, code })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ vertical: data });
    } catch (error) {
        console.error('Error updating vertical:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /settings/verticals/:id
router.delete('/verticals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('verticals')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting vertical:', error);
        res.status(500).json({ error: error.message });
    }
});

// === DEPARTMENTS ===

// GET /settings/departments
router.get('/departments', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name');

        if (error) throw error;
        res.json({ departments: data });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /settings/departments
router.post('/departments', async (req, res) => {
    try {
        const { name, code, display_order } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const { data, error } = await supabase
            .from('departments')
            .insert({ name, code, display_order })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ department: data });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /settings/departments/:id
router.put('/departments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, display_order } = req.body;

        const { data, error } = await supabase
            .from('departments')
            .update({ name, code, display_order })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ department: data });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
