-- Fix security warnings: Make audit_logs and encryption_events INSERT policies more restrictive
-- These should only allow authenticated users to insert their own logs

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert encryption events" ON public.encryption_events;

-- New restrictive policies - only authenticated users can insert logs with their own user_id
CREATE POLICY "Authenticated users can insert own audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Authenticated users can insert own encryption events" ON public.encryption_events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;