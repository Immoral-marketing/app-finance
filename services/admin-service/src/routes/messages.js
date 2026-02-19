import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// ================================================
// MENSAJERÍA INTERNA ENTRE USUARIOS
// IMPORTANTE: rutas específicas ANTES que /:otherUserId
// ================================================

/**
 * POST /messages/send
 * Body: { receiver_id: string, message: string }
 */
router.post('/send', async (req, res) => {
    const { receiver_id, message } = req.body;
    const { authorization } = req.headers;

    if (!message?.trim()) return res.status(400).json({ error: 'Mensaje vacío' });

    let senderId = null;
    if (authorization) {
        const token = authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        senderId = user?.id;
    }
    if (!senderId) return res.status(401).json({ error: 'No autenticado' });

    const { data, error } = await supabase
        .from('chat_messages')
        .insert({ sender_id: senderId, receiver_id, message })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: data });
});

/**
 * GET /messages/unread-count   ← DEBE IR ANTES DE /:otherUserId
 * Número total de mensajes sin leer para el usuario autenticado
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
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

    if (error) return res.json({ count: 0 });
    res.json({ count: count || 0 });
});

/**
 * POST /messages/mark-read     ← ANTES DE /:otherUserId
 * Body: { other_user_id: string }
 */
router.post('/mark-read', async (req, res) => {
    const { authorization } = req.headers;
    const { other_user_id } = req.body;

    let userId = null;
    if (authorization) {
        const token = authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
    }
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', other_user_id)
        .eq('is_read', false);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

/**
 * GET /messages
 * Lista todas las conversaciones (último mensaje por usuario)
 */
router.get('/', async (req, res) => {
    const { authorization } = req.headers;

    let userId = null;
    if (authorization) {
        const token = authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
    }
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) return res.status(500).json({ error: error.message });

    // Agrupar por conversación (el otro usuario)
    const conversations = {};
    (data || []).forEach(msg => {
        const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!conversations[otherId]) {
            conversations[otherId] = {
                other_user_id: otherId,
                last_message: msg.message,
                last_at: msg.created_at,
                unread: 0
            };
        }
        if (msg.receiver_id === userId && !msg.is_read) {
            conversations[otherId].unread++;
        }
    });

    res.json({ conversations: Object.values(conversations) });
});

/**
 * GET /messages/:otherUserId   ← SIEMPRE AL FINAL (es la ruta más genérica)
 * Trae la conversación entre el usuario autenticado y otherUserId
 */
router.get('/:otherUserId', async (req, res) => {
    const { authorization } = req.headers;
    const { otherUserId } = req.params;
    const limit = parseInt(req.query.limit || '50');

    let userId = null;
    if (authorization) {
        const token = authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
    }
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ messages: data || [] });
});

export default router;
