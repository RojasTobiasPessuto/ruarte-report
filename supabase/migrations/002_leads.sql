-- Leads (subscribers que solicitaron agenda desde ManyChat)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manychat_subscriber_id TEXT UNIQUE,
  ig_username TEXT,
  name TEXT,
  first_angle TEXT,
  all_angles JSONB DEFAULT '[]',
  last_angle TEXT,
  total_angles INTEGER DEFAULT 0,
  manychat_joined_at TIMESTAMPTZ,
  agenda_requested_at TIMESTAMPTZ DEFAULT now(),
  time_to_agenda_hours NUMERIC,
  status TEXT DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'agendado', 'contactado', 'cerrado', 'perdido')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_manychat_id ON leads(manychat_subscriber_id);
CREATE INDEX idx_leads_agenda ON leads(agenda_requested_at DESC);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read leads" ON leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service manage leads" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin manage leads" ON leads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
