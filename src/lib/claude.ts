import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisRequest } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const ANALYSIS_PROMPT = `Eres un analista experto en ventas y llamadas comerciales. Tu trabajo es analizar transcripciones de llamadas de ventas y generar un análisis detallado y estructurado.

Analiza la siguiente transcripción de una llamada de ventas y devuelve ÚNICAMENTE un JSON válido (sin markdown, sin backticks, solo el JSON) con la siguiente estructura exacta:

{
  "contact_name": "Nombre completo del prospecto/cliente/lead mencionado en la llamada. Si no se menciona, null.",
  "summary": "Resumen ejecutivo de la llamada en 3-5 oraciones. Debe ser claro y entendible para un gerente que no escuchó la llamada.",
  "result": "closed | not_closed | follow_up | not_qualified",
  "result_reason": "Explicación clara de por qué se cerró o no se cerró la venta",
  "close_probability": 0-100 (solo si result es follow_up, sino null),
  "sentiment_score": 1-10 (qué tan a gusto se sintió el prospecto),
  "sentiment_evolution": [
    {"stage": "inicio", "score": 1-10, "note": "descripción breve"},
    {"stage": "presentación", "score": 1-10, "note": "descripción breve"},
    {"stage": "objeciones", "score": 1-10, "note": "descripción breve"},
    {"stage": "cierre", "score": 1-10, "note": "descripción breve"}
  ],
  "call_quality_score": 1-10 (calidad general de la llamada del closer),
  "talk_listen_ratio": {"closer": 0-100, "prospect": 0-100},
  "objections": [
    {"objection": "la objeción planteada", "response": "cómo respondió el closer", "handled_well": true/false}
  ],
  "power_words": ["palabra o frase contundente que funcionó bien"],
  "missing_elements": ["qué faltó para cerrar la venta"],
  "strengths": ["qué hizo bien el closer"],
  "improvements": ["recomendaciones específicas para mejorar"],
  "next_steps": "próximos pasos acordados o sugeridos",
  "follow_up_date": "YYYY-MM-DD o null si no se acordó",
  "price_discussed": true/false,
  "urgency_level": "low | medium | high",
  "key_topics": ["tema principal 1", "tema principal 2"]
}

IMPORTANTE:
- El resumen debe ser en español
- Sé específico y concreto, no genérico
- Si no hay suficiente información para un campo, usa valores razonables basados en el contexto
- Las objeciones deben incluir exactamente cómo respondió el closer
- Las recomendaciones deben ser accionables y específicas`

export async function analyzeCall(request: AnalysisRequest): Promise<Record<string, unknown>> {
  const userMessage = request.fathom_summary
    ? `Resumen de Fathom:\n${request.fathom_summary}\n\nTranscripción completa:\n${request.transcript}`
    : `Transcripción de la llamada:\n${request.transcript}`

  if (request.contact_name) {
    // Add contact context
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\n${userMessage}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const analysis = JSON.parse(content.text)
  return analysis
}
