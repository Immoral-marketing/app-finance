import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// ============================================================
// NOTIFICATIONS — Asignaciones en notas de P&L y Billing
// ============================================================

/**
 * GET /notifications
 * Lista las notificaciones del usuario autenticado
 */
router.get('/', async (req, res) => {
    const { authorization } = req.headers;
    const limit = parseInt(req.query.limit || '30');

    let userId = null;
    if (authorization) {
        const token = authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
    }
    if (!userId) return res.json({ notifications: [] });

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ notifications: data || [] });
});

/**
 * GET /notifications/unread-count
 * Cuenta las notificaciones sin leer del usuario autenticado
 */
router.get('/unread-count', async (req, res) => {
    const { authorization } = req.headers;

    let userId = null;
    if (authorization) {
        const token = authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
    }
    if (!userId) return res.json({ count: 0 });

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) return res.json({ count: 0 });
    res.json({ count: count || 0 });
});

/**
 * POST /notifications/mark-read
 * Marca como leídas: una notificación o todas
 * Body: { id?: string } — si no se envía id, marca TODAS como leídas
 */
router.post('/mark-read', async (req, res) => {
    const { authorization } = req.headers;
    const { id } = req.body;

    let userId = null;
    if (authorization) {
        const token = authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
    }
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

    if (id) {
        query = query.eq('id', id);
    } else {
        query = query.eq('is_read', false);
    }

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

/**
 * [INTERNO] Función helper para crear notificaciones desde otros routes
 * No es un endpoint HTTP, se llama directamente con el service role
 */
export async function createNotifications(userIds, type, title, body, entityType, entityId) {
    if (!userIds?.length) return;

    const records = userIds.map(userId => ({
        user_id: userId,
        type,
        title,
        body: body || null,
        entity_type: entityType || null,
        entity_id: entityId || null,
        is_read: false
    }));

    const { error } = await supabase.from('notifications').insert(records);
    if (error) {
        console.error('Error creating notifications:', error.message);
    }
}

export default router;
