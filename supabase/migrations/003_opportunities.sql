-- =====================================================
-- Migration 003: Oportunidades, Pipeline, Ventas y Pagos
-- =====================================================

-- ==========================================
-- TABLA: roles
-- ==========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Permisos globales
  can_view_all BOOLEAN DEFAULT false,
  can_manage_users BOOLEAN DEFAULT false,
  can_manage_closers BOOLEAN DEFAULT false,
  can_view_leads BOOLEAN DEFAULT false,
  can_manage_leads BOOLEAN DEFAULT false,
  can_import BOOLEAN DEFAULT false,

  -- Permisos pipeline
  can_view_all_opportunities BOOLEAN DEFAULT false,
  can_fill_post_agenda BOOLEAN DEFAULT false,

  -- Permisos ventas/pagos
  can_create_payment BOOLEAN DEFAULT false,
  can_edit_payment BOOLEAN DEFAULT false,
  can_view_all_payments BOOLEAN DEFAULT false,

  -- Permisos llamadas
  can_view_all_calls BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed de roles
INSERT INTO roles (name, description, can_view_all, can_manage_users, can_manage_closers, can_view_leads, can_manage_leads, can_import, can_view_all_opportunities, can_fill_post_agenda, can_create_payment, can_edit_payment, can_view_all_payments, can_view_all_calls)
VALUES
  ('admin', 'Acceso total', true, true, true, true, true, true, true, true, true, true, true, true),
  ('manager', 'Jefe de área - ve todo, no gestiona usuarios', true, false, false, true, false, false, true, true, false, false, true, true),
  ('closer', 'Vendedor - ve solo lo suyo', false, false, false, false, false, false, false, true, true, false, false, false),
  ('setter', 'Solo sus agendas', false, false, false, false, false, false, false, false, false, false, false, false)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- TABLA: contacts (Centro de trazabilidad)
-- ==========================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manychat_subscriber_id TEXT UNIQUE,
  ghl_contact_id TEXT UNIQUE,
  ig_username TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_manychat ON contacts(manychat_subscriber_id);
CREATE INDEX IF NOT EXISTS idx_contacts_ghl ON contacts(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_ig ON contacts(ig_username);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- ==========================================
-- TABLA: payment_types (catálogo)
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed de payment_types
INSERT INTO payment_types (name) VALUES
  ('Stripe'),
  ('Transfer'),
  ('Crypto'),
  ('Cash'),
  ('Deposito')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- TABLA: opportunities
-- ==========================================
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculos
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ghl_opportunity_id TEXT UNIQUE,
  ghl_contact_id TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  closer_id UUID REFERENCES closers(id) ON DELETE SET NULL,

  -- Contacto
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Pipeline
  pipeline_stage TEXT,
  ghl_pipeline_stage_id TEXT,

  -- Post-Agenda
  estado_cita TEXT,
  programa TEXT,
  situacion TEXT,
  descripcion_llamada TEXT,
  volumen_real NUMERIC,
  fecha_llamada TIMESTAMPTZ,
  fecha_seguimiento TIMESTAMPTZ,

  -- Legacy (datos históricos, no usar para nuevas ventas)
  legacy_forma_pago TEXT,
  legacy_tipo_pago TEXT,
  legacy_revenue NUMERIC,
  legacy_cash NUMERIC,
  legacy_deposito_broker NUMERIC,
  legacy_monto_restante NUMERIC,
  legacy_codigo_transaccion TEXT,
  legacy_cantidad_cuotas INTEGER,

  -- Metadata
  form_completed BOOLEAN DEFAULT false,
  source TEXT,
  respuesta_calendario TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opp_contact ON opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opp_ghl ON opportunities(ghl_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_lead ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_opp_call ON opportunities(call_id);
CREATE INDEX IF NOT EXISTS idx_opp_closer ON opportunities(closer_id);
CREATE INDEX IF NOT EXISTS idx_opp_stage ON opportunities(pipeline_stage);

-- ==========================================
-- TABLA: sales
-- ==========================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  payment_type_id UUID REFERENCES payment_types(id) ON DELETE SET NULL,

  forma_pago TEXT CHECK (forma_pago IN ('Fee', 'Pago Completo', 'Pago Dividido', 'Pago Programado', 'Deposito')),
  revenue NUMERIC DEFAULT 0,
  cantidad_cuotas INTEGER DEFAULT 0,
  deposito_broker NUMERIC DEFAULT 0,
  codigo_transaccion TEXT,
  justificante_url TEXT,
  completada BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_opp ON sales(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_completada ON sales(completada);

-- ==========================================
-- TABLA: payments (cuotas)
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  nro_cuota INTEGER NOT NULL,
  monto NUMERIC NOT NULL,
  fecha_pago DATE,
  fecha_proximo_pago DATE,
  pagado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_pagado ON payments(pagado);
CREATE INDEX IF NOT EXISTS idx_payments_fecha ON payments(fecha_pago DESC);

-- ==========================================
-- ALTER: closers (agregar ghl_user_id y fathom_email)
-- ==========================================
ALTER TABLE closers ADD COLUMN IF NOT EXISTS ghl_user_id TEXT;
ALTER TABLE closers ADD COLUMN IF NOT EXISTS fathom_email TEXT;

CREATE INDEX IF NOT EXISTS idx_closers_ghl_user ON closers(ghl_user_id);

-- Poblar ghl_user_id para los 2 closers conocidos
UPDATE closers SET ghl_user_id = 'C2SwzhFR5qWW3F7CC7WP' WHERE name ILIKE '%hernan%' AND ghl_user_id IS NULL;
UPDATE closers SET ghl_user_id = 'UFjkz8kaKGQDpRCTBE5u' WHERE name ILIKE '%patricio%' AND ghl_user_id IS NULL;

-- ==========================================
-- ALTER: app_users (agregar role_id y closer_id)
-- ==========================================
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS closer_id UUID REFERENCES closers(id) ON DELETE SET NULL;

-- Migrar usuarios existentes al nuevo sistema de roles
-- admins existentes → role admin, viewers existentes → role closer
UPDATE app_users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE role = 'admin' AND role_id IS NULL;

UPDATE app_users
SET role_id = (SELECT id FROM roles WHERE name = 'closer')
WHERE role = 'viewer' AND role_id IS NULL;

-- ==========================================
-- FUNCIÓN: calcular monto_restante de una sale
-- ==========================================
CREATE OR REPLACE FUNCTION get_monto_restante(sale_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_revenue NUMERIC;
  v_pagado NUMERIC;
BEGIN
  SELECT revenue INTO v_revenue FROM sales WHERE id = sale_uuid;
  SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM payments WHERE sale_id = sale_uuid AND pagado = true;
  RETURN COALESCE(v_revenue, 0) - COALESCE(v_pagado, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- RLS: Row Level Security
-- ==========================================

-- roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service manage roles" ON roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage roles" ON roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read contacts" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service manage contacts" ON contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage contacts" ON contacts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- payment_types
ALTER TABLE payment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read payment_types" ON payment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service manage payment_types" ON payment_types FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage payment_types" ON payment_types FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read opportunities" ON opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service manage opportunities" ON opportunities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage opportunities" ON opportunities FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service manage sales" ON sales FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage sales" ON sales FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service manage payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin manage payments" ON payments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
