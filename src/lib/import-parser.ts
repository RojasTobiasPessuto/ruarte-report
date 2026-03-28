/**
 * Parser for historical call analysis documents from Google Docs.
 * Format: "DD/MM/YYYY Llamada Closer con Lead: ContactName"
 * Content: 6 scored blocks + global score + conclusion
 */

export interface ParsedImport {
  date: string // ISO format
  closerName: string
  contactName: string
  rawContent: string
  // Parsed analysis
  summary: string
  result: 'closed' | 'not_closed' | 'follow_up' | 'not_qualified'
  resultReason: string
  globalScore: number
  leadQuality: string
  conclusion: string
  blocks: ParsedBlock[]
  // Extracted data from block 1
  leadCountry: string | null
  leadProfile: string | null
  leadCapital: string | null
  leadExperience: string | null
  leadProduct: string | null
  leadObjective: string | null
  leadHorizon: string | null
  leadDecisionLevel: string | null
}

export interface ParsedBlock {
  number: number
  title: string
  score: number
  analysis: string
  suggestions: string[]
}

/**
 * Parse the filename to extract date, closer name, and contact name.
 * Format: "29/01/2026 Llamada Closer con Lead:  Pao"
 */
export function parseFilename(filename: string): {
  date: string
  closerName: string
  contactName: string
} {
  // Remove file extension
  const name = filename.replace(/\.(txt|doc|docx)$/i, '').trim()

  // Extract date (DD/MM/YYYY at the start)
  const dateMatch = name.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  let date = new Date().toISOString()
  if (dateMatch) {
    const [, day, month, year] = dateMatch
    date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00Z`).toISOString()
  }

  // Extract closer name and contact name
  // Pattern: "Llamada {CloserName} con Lead: {ContactName}"
  const nameMatch = name.match(/Llamada\s+(.+?)\s+con\s+Lead:\s*(.+)/i)
  let closerName = 'Desconocido'
  let contactName = 'Desconocido'

  if (nameMatch) {
    closerName = nameMatch[1].trim()
    contactName = nameMatch[2].trim()
  }

  return { date, closerName, contactName }
}

/**
 * Parse the document content into structured data.
 */
export function parseDocContent(content: string): Omit<ParsedImport, 'date' | 'closerName' | 'contactName' | 'rawContent'> {
  const blocks: ParsedBlock[] = []

  // Split into sections by the separator line
  const sections = content.split(/─{10,}/).map((s) => s.trim()).filter(Boolean)

  // Parse each numbered block (1-6)
  for (const section of sections) {
    const blockMatch = section.match(/^(\d+)\.\s+(.+?)\s*\n\s*\(Puntuación:\s*(\d+(?:\.\d+)?)\/10\)/m)
    if (blockMatch) {
      const blockNumber = parseInt(blockMatch[1])
      const title = blockMatch[2].trim()
      const score = parseFloat(blockMatch[3])

      // Extract analysis
      const analysisMatch = section.match(/Análisis:\s*\n([\s\S]*?)(?=\nSugerencias de mejora:|$)/i)
      const analysis = analysisMatch ? analysisMatch[1].trim() : ''

      // Extract suggestions
      const suggestionsMatch = section.match(/Sugerencias de mejora:\s*\n([\s\S]*?)$/i)
      const suggestions: string[] = []
      if (suggestionsMatch) {
        suggestionsMatch[1]
          .split('\n')
          .map((l) => l.replace(/^[-•]\s*/, '').trim())
          .filter(Boolean)
          .forEach((s) => suggestions.push(s))
      }

      blocks.push({ number: blockNumber, title, score, analysis, suggestions })
    }
  }

  // Parse global score
  const globalScoreMatch = content.match(/Puntuación final\s*\(1[–-]10\):\s*(\d+(?:\.\d+)?)/i)
  const globalScore = globalScoreMatch ? parseFloat(globalScoreMatch[1]) : 0

  // Parse lead quality
  const qualityMatch = content.match(/Calidad del lead:\s*\n\s*☑️?\s*(.+)/i)
  const leadQuality = qualityMatch ? qualityMatch[1].trim() : 'No especificada'

  // Parse conclusion
  const conclusionMatch = content.match(/Conclusión general:\s*\n([\s\S]*?)$/i)
  const conclusion = conclusionMatch ? conclusionMatch[1].trim() : ''

  // Extract lead data from block 1
  const block1Section = sections.find((s) => s.match(/^1\.\s+Resumen del Lead/m))
  const leadData = parseLeadData(block1Section || '')

  // Determine result based on content analysis
  const result = determineResult(content, globalScore)
  const resultReason = deriveResultReason(content, blocks, conclusion)

  // Build summary from conclusion and block analyses
  const summary = buildSummary(blocks, conclusion, leadData.leadObjective)

  return {
    summary,
    result,
    resultReason,
    globalScore,
    leadQuality,
    conclusion,
    blocks,
    ...leadData,
  }
}

function parseLeadData(block1Content: string) {
  const extract = (pattern: RegExp): string | null => {
    const match = block1Content.match(pattern)
    if (!match) return null
    const value = match[1].trim()
    return value.toLowerCase().includes('no mencionado') || value.toLowerCase().includes('no definido')
      ? null
      : value
  }

  return {
    leadCountry: extract(/País:\s*(.+)/i),
    leadProfile: extract(/Perfil principal:\s*(.+)/i),
    leadCapital: extract(/Capital estimado[^:]*:\s*(.+)/i),
    leadExperience: extract(/Experiencia previa[^:]*:\s*(.+)/i),
    leadProduct: extract(/Producto[^:]*:\s*(.+)/i),
    leadObjective: extract(/Objetivo principal[^:]*:\s*(.+)/i),
    leadHorizon: extract(/Horizonte temporal:\s*(.+)/i),
    leadDecisionLevel: extract(/Nivel de decisión:\s*(.+)/i),
  }
}

function determineResult(content: string, globalScore: number): 'closed' | 'not_closed' | 'follow_up' | 'not_qualified' {
  const lower = content.toLowerCase()

  if (lower.includes('se cerró') || lower.includes('venta cerrada') || lower.includes('cierre exitoso') || lower.includes('pago') && lower.includes('confirmado')) {
    return 'closed'
  }
  if (lower.includes('no calificado') || lower.includes('no califica') || lower.includes('no es un lead')) {
    return 'not_qualified'
  }
  if (lower.includes('seguimiento') || lower.includes('follow up') || lower.includes('próxima llamada') || lower.includes('volver a contactar')) {
    return 'follow_up'
  }
  // Use score as fallback
  if (globalScore >= 8) return 'closed'
  if (globalScore >= 5) return 'follow_up'
  return 'not_closed'
}

function deriveResultReason(content: string, blocks: ParsedBlock[], conclusion: string): string {
  if (conclusion) return conclusion
  const closingBlock = blocks.find((b) => b.number === 6)
  if (closingBlock) return closingBlock.analysis
  return 'Resultado derivado del análisis general de la llamada.'
}

function buildSummary(blocks: ParsedBlock[], conclusion: string, objective: string | null): string {
  const parts: string[] = []

  if (objective) {
    parts.push(`Objetivo del lead: ${objective}.`)
  }

  // Use block 1 analysis for context
  const discoveryBlock = blocks.find((b) => b.number === 3)
  if (discoveryBlock?.analysis) {
    parts.push(discoveryBlock.analysis)
  }

  if (conclusion) {
    parts.push(conclusion)
  }

  return parts.join(' ') || 'Resumen no disponible.'
}

/**
 * Convert parsed import data to the format expected by call_analyses table.
 */
export function toCallAnalysis(parsed: ParsedImport) {
  const objections: Array<{ objection: string; response: string; handled_well: boolean }> = []
  const strengths: string[] = []
  const improvements: string[] = []
  const powerWords: string[] = []

  for (const block of parsed.blocks) {
    // Blocks with high scores → strengths
    if (block.score >= 7) {
      strengths.push(`${block.title}: ${block.analysis.substring(0, 100)}`)
    }

    // Collect all suggestions as improvements
    improvements.push(...block.suggestions)

    // Block 6 (objections/closing) → extract objections
    if (block.number === 6 && block.suggestions.length > 0) {
      block.suggestions.forEach((s) => {
        objections.push({
          objection: s,
          response: 'Ver análisis detallado',
          handled_well: block.score >= 7,
        })
      })
    }
  }

  // Sentiment evolution from block scores
  const sentimentEvolution = parsed.blocks.map((b) => ({
    stage: b.title.substring(0, 30),
    score: b.score,
    note: b.analysis.substring(0, 80),
  }))

  return {
    summary: parsed.summary,
    result: parsed.result,
    result_reason: parsed.resultReason,
    close_probability: parsed.result === 'follow_up' ? Math.round(parsed.globalScore * 10) : null,
    sentiment_score: Math.round(parsed.globalScore),
    sentiment_evolution: sentimentEvolution,
    call_quality_score: Math.round(parsed.globalScore),
    talk_listen_ratio: { closer: 60, prospect: 40 }, // Default estimate
    objections,
    power_words: powerWords,
    missing_elements: parsed.blocks
      .filter((b) => b.score < 6)
      .map((b) => `${b.title} (${b.score}/10)`),
    strengths,
    improvements: improvements.slice(0, 10), // Limit to top 10
    next_steps: null,
    follow_up_date: null,
    price_discussed: parsed.rawContent.toLowerCase().includes('precio') || parsed.rawContent.toLowerCase().includes('pago'),
    urgency_level: parsed.globalScore >= 7 ? 'high' : parsed.globalScore >= 5 ? 'medium' : 'low' as const,
    key_topics: [
      parsed.leadProfile,
      parsed.leadObjective,
      parsed.leadProduct,
    ].filter(Boolean) as string[],
    raw_analysis: {
      source: 'import',
      format: 'fathom_doc',
      blocks: parsed.blocks,
      lead_quality: parsed.leadQuality,
      lead_data: {
        country: parsed.leadCountry,
        capital: parsed.leadCapital,
        experience: parsed.leadExperience,
        horizon: parsed.leadHorizon,
        decision_level: parsed.leadDecisionLevel,
      },
    },
  }
}
