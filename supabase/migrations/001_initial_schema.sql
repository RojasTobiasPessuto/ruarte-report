-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Closers (vendedores)
CREATE TABLE closers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Llamadas
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID REFERENCES closers(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  fathom_call_id TEXT UNIQUE,
  call_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  transcript TEXT,
  fathom_summary TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'notified', 'error')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Análisis de llamadas (generado por Claude)
CREATE TABLE call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE UNIQUE,
  summary TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('closed', 'not_closed', 'follow_up', 'not_qualified')),
  result_reason TEXT,
  close_probability INTEGER CHECK (close_probability BETWEEN 0 AND 100),
  sentiment_score INTEGER CHECK (sentiment_score BETWEEN 1 AND 10),
  sentiment_evolution JSONB,
  call_quality_score INTEGER CHECK (call_quality_score BETWEEN 1 AND 10),
  talk_listen_ratio JSONB,
  objections JSONB,
  power_words JSONB,
  missing_elements JSONB,
  strengths JSONB,
  improvements JSONB,
  next_steps TEXT,
  follow_up_date DATE,
  price_discussed BOOLEAN DEFAULT false,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high')),
  key_topics JSONB,
  raw_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usuarios de la app
CREATE TABLE app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_calls_closer_id ON calls(closer_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_call_date ON calls(call_date DESC);
CREATE INDEX idx_call_analyses_call_id ON call_analyses(call_id);
CREATE INDEX idx_call_analyses_result ON call_analyses(result);

-- Row Level Security
ALTER TABLE closers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read all data
CREATE POLICY "Authenticated users can read closers" ON closers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage closers" ON closers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can read calls" ON calls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage calls" ON calls
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read analyses" ON call_analyses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage analyses" ON call_analyses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own profile" ON app_users
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins can manage users" ON app_users
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'));

-- Allow anonymous read access to call analyses for public summary page
CREATE POLICY "Public can read analyses for summary" ON call_analyses
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read calls for summary" ON calls
  FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read closers for summary" ON closers
  FOR SELECT TO anon USING (true);
