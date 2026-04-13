// Closer type
export interface Closer {
  id: string;
  name: string;
  email: string | null;
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
  role: 'admin' | 'viewer';
  created_at: string;
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
