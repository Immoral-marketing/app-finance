-- Script: 11_chat_messages.sql
-- Tabla para mensajería interna entre usuarios

CREATE TABLE IF NOT EXISTS chat_messages (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = todos/broadcast
    message     text NOT NULL,
    is_read     boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender   ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created  ON chat_messages(created_at DESC);

-- RLS: Cada usuario solo ve sus mensajes
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON chat_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark as read" ON chat_messages
    FOR UPDATE USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);
