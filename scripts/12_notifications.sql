-- Script: 12_notifications.sql
-- Tabla de notificaciones del sistema (asignaciones en notas, etc.)

CREATE TABLE IF NOT EXISTS notifications (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type         text NOT NULL DEFAULT 'note_assigned',
    -- 'note_assigned'  → usuario asignado en una nota de P&L o Billing
    -- 'message'        → (reservado)
    title        text NOT NULL,
    body         text,
    entity_type  text,  -- 'pl_note' | 'billing_note'
    entity_id    text,  -- key de la celda (year-section-dept-item-month) o billing_detail_id
    is_read      boolean DEFAULT false,
    created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS para que cada usuario solo vea sus propias notificaciones
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- El service role (backend) puede insertar sin restricciones (bypassa RLS)
-- Si usas anon key en el backend, necesitas esta política:
CREATE POLICY "Backend can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can mark own notifications read" ON notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
