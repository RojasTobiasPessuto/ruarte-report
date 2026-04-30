// Closer type
export interface Closer {
  id: string;
  name: string;
  email: string | null;
  ghl_user_id: string | null;
  fathom_email: string | null;
  active: boolean;
  created_at: string;
}

// Role type
export interface Role {
  id: string;
  name: 'admin' | 'manager' | 'closer' | 'setter' | string;
  description: string | null;
  can_view_all: boolean;
  can_manage_users: boolean;
  can_manage_closers: boolean;
  can_view_leads: boolean;
  can_manage_leads: boolean;
  can_import: boolean;
  can_view_all_opportunities: boolean;
  can_fill_post_agenda: boolean;
  can_create_payment: boolean;
  can_edit_payment: boolean;
  can_view_all_payments: boolean;
  can_view_all_calls: boolean;
  created_at: string;
}

// Contact type (identidad unificada)
export interface Contact {
  id: string;
  manychat_subscriber_id: string | null;
  ghl_contact_id: string | null;
  ig_username: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// PaymentType catalog
export interface PaymentType {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

// Call type
export interface Call {
  id: string;
  closer_id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  fathom_call_id: string | null;
  fathom_url: string | null;
  call_date: string;
  duration_minutes: number | null;
  transcript: string | null;
  fathom_summary: string | null;
  status: 'pending' | 'analyzed' | 'notified' | 'error';
  created_at: string;
  // Joined fields
  closer?: Closer;
  analysis?: CallAnalysis;
}

// Objection type
export interface Objection {
  objection: string;
  response: string;
  handled_well: boolean;
}

// Sentiment evolution point
export interface SentimentPoint {
  stage: string;
  score: number;
  note: string;
}

// Call Analysis type
export interface CallAnalysis {
  id: string;
  call_id: string;
  summary: string;
  result: 'closed' | 'not_closed' | 'follow_up' | 'not_qualified';
  result_reason: string | null;
  close_probability: number | null;
  sentiment_score: number;
  sentiment_evolution: SentimentPoint[];
  call_quality_score: number;
  talk_listen_ratio: { closer: number; prospect: number };
  objections: Objection[];
  power_words: string[];
  missing_elements: string[];
  strengths: string[];
  improvements: string[];
  next_steps: string | null;
  follow_up_date: string | null;
  price_discussed: boolean;
  urgency_level: 'low' | 'medium' | 'high';
  key_topics: string[];
  raw_analysis: Record<string, unknown>;
  created_at: string;
}

// App User type
export interface AppUser {
  id: string;
  email: string;
  role: 'admin' | 'viewer' | string; // Legacy, usar role_id + Role
  role_id: string | null;
  closer_id: string | null;
  created_at: string;
  // Joined
  role_data?: Role;
  closer?: Closer;
}

// Dashboard stats
export interface DashboardStats {
  totalCalls: number;
  closedCalls: number;
  closeRate: number;
  avgSentiment: number;
  avgQuality: number;
  totalFollowUps: number;
}

// Claude analysis request/response
export interface AnalysisRequest {
  transcript: string;
  fathom_summary?: string;
  contact_name?: string;
}

// Lead type (ManyChat subscribers que solicitaron agenda)
export interface Lead {
  id: string;
  manychat_subscriber_id: string | null;
  ig_username: string | null;
  name: string | null;
  first_angle: string | null;
  all_angles: string[];
  last_angle: string | null;
  total_angles: number;
  manychat_joined_at: string | null;
  agenda_requested_at: string;
  time_to_agenda_hours: number | null;
  status: 'nuevo' | 'agendado' | 'contactado' | 'cerrado' | 'perdido';
  created_at: string;
}

// Opportunity type (GHL pipeline "Agendas")
export type PipelineStage =
  | 'Agendado (Nuevo)'
  | 'Agendado (Confirmado)'
  | 'Post Llamada'
  | 'ReAgendado'
  | 'Seguimiento'
  | 'Compro'
  | 'No Compro'
  | 'Cancelado'
  | 'No Asistio';

export type EstadoCita = 'Nueva' | 'Confirmada' | 'Cancelada' | 'Asistido' | 'No Asistido';

export type Programa =
  | 'Mastermind'
  | 'Formación'
  | 'Programa PLUS'
  | 'LITE'
  | 'PAMM - Manejo de Portafolio'
  | 'No Califica';

export type Situacion =
  | 'Adentro en Llamada'
  | 'Adentro en Seguimiento'
  | 'Seguimiento'
  | 'Perdido'
  | 'ReCompra';

export type FormaPago =
  | 'Fee'
  | 'Pago Completo'
  | 'Pago Dividido'
  | 'Pago Programado'
  | 'Deposito';

export interface Opportunity {
  id: string;
  // Vínculos
  contact_id: string | null;
  ghl_opportunity_id: string | null;
  ghl_contact_id: string | null;
  ghl_assigned_to: string | null;
  lead_id: string | null;
  call_id: string | null;
  closer_id: string | null;
  // Contacto
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  // Pipeline
  pipeline_stage: PipelineStage | null;
  ghl_pipeline_stage_id: string | null;
  // Post-Agenda
  estado_cita: EstadoCita | null;
  programa: Programa | null;
  situacion: Situacion | null;
  descripcion_llamada: string | null;
  volumen_real: number | null;
  fecha_llamada: string | null;
  fecha_seguimiento: string | null;
  // Legacy
  legacy_forma_pago: string | null;
  legacy_tipo_pago: string | null;
  legacy_revenue: number | null;
  legacy_cash: number | null;
  legacy_deposito_broker: number | null;
  legacy_monto_restante: number | null;
  legacy_codigo_transaccion: string | null;
  legacy_cantidad_cuotas: number | null;
  // Metadata
  form_completed: boolean;
  source: string | null;
  respuesta_calendario: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact;
  closer?: Closer;
  lead?: Lead;
  call?: Call;
  sales?: Sale[];
}

// Sale type (una venta)
export interface Sale {
  id: string;
  opportunity_id: string;
  payment_type_id: string | null;
  forma_pago: FormaPago | null;
  revenue: number;
  cantidad_cuotas: number;
  deposito_broker: number;
  codigo_transaccion: string | null;
  justificante_url: string | null;
  completada: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  payment_type?: PaymentType;
  payments?: Payment[];
  monto_restante?: number; // calculado
}

// Payment type (cuota individual)
export interface Payment {
  id: string;
  sale_id: string;
  nro_cuota: number;
  monto: number;
  fecha_pago: string | null;
  fecha_proximo_pago: string | null;
  pagado: boolean;
  justificante_urls: string[] | null;
  created_at: string;
}

// Webhook saliente payload
export interface OutboundWebhookPayload {
  event: 'sale.created' | 'payment.created' | 'sale.completed' | 'opportunity.updated';
  timestamp: string;
  opportunity: {
    id: string;
    ghl_opportunity_id: string | null;
    pipeline_stage: string | null;
    estado_cita: string | null;
    programa: string | null;
    situacion: string | null;
    descripcion_llamada: string | null;
    volumen_real: number | null;
    fecha_llamada: string | null;
  };
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    ig_username: string | null;
  };
  closer: {
    name: string | null;
    email: string | null;
  } | null;
  sale?: {
    id: string;
    forma_pago: string | null;
    tipo_pago: string | null;
    revenue: number;
    monto_restante: number;
    cantidad_cuotas: number;
    deposito_broker: number;
    codigo_transaccion: string | null;
    completada: boolean;
  };
  payment?: {
    nro_cuota: number;
    monto: number;
    fecha_pago: string | null;
    fecha_proximo_pago: string | null;
    pagado: boolean;
  };
}

// Fathom webhook payload (based on typical Fathom webhook structure)
export interface FathomWebhookPayload {
  call_id: string;
  title: string;
  summary: string;
  transcript: string;
  duration: number;
  attendees: Array<{
    name: string;
    email: string;
  }>;
  created_at: string;
}
