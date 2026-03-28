/**
 * Fathom AI API client
 * Docs: https://developers.fathom.ai/api-reference
 */

const FATHOM_API_BASE = 'https://api.fathom.ai/external/v1'

interface FathomAttendee {
  name: string
  email: string
  email_domain: string
  is_external: boolean
}

interface FathomTranscriptEntry {
  display_name: string
  matched_calendar_invitee_email: string | null
  text: string
  timestamp: string
}

interface FathomRecording {
  id: string
  title: string
  url: string
  share_url: string
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  recording_start_time: string
  recording_end_time: string
  created_at: string
  calendar_invitees: FathomAttendee[]
  recorded_by: {
    name: string
    email: string
    team: string | null
  }
  transcript?: FathomTranscriptEntry[]
  default_summary?: {
    template_name: string
    summary: string
  }
  action_items?: Array<{
    description: string
    assignee: { name: string; email: string } | null
    timestamp: string
  }>
}

interface FathomListResponse {
  recordings: FathomRecording[]
  next_cursor: string | null
}

export async function listRecordings(
  apiKey: string,
  options: {
    createdAfter?: string
    limit?: number
    includeTranscript?: boolean
    includeSummary?: boolean
  } = {}
): Promise<FathomRecording[]> {
  const params = new URLSearchParams()

  if (options.limit) params.set('limit', options.limit.toString())
  if (options.createdAfter) params.set('created_after', options.createdAfter)
  if (options.includeTranscript) params.set('include_transcript', 'true')
  if (options.includeSummary) params.set('include_summary', 'true')

  const allRecordings: FathomRecording[] = []
  let cursor: string | null = null

  do {
    if (cursor) params.set('next_cursor', cursor)

    const response = await fetch(
      `${FATHOM_API_BASE}/meetings?${params.toString()}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Fathom API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    // Handle different response formats from Fathom API
    const recordings: FathomRecording[] = Array.isArray(data)
      ? data
      : data.items || data.recordings || data.data || data.results || []

    if (!Array.isArray(recordings)) {
      console.error('Unexpected Fathom API response format:', JSON.stringify(data).substring(0, 500))
      break
    }

    allRecordings.push(...recordings)
    cursor = data.next_cursor || data.nextCursor || null
  } while (cursor)

  return allRecordings
}

/**
 * Convert Fathom transcript entries to a single string
 */
export function formatTranscript(entries: FathomTranscriptEntry[]): string {
  return entries
    .map((e) => `[${e.timestamp}] ${e.display_name}: ${e.text}`)
    .join('\n')
}

/**
 * Calculate call duration in minutes from start/end times
 */
export function calculateDuration(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000)
}

export type { FathomRecording, FathomAttendee, FathomTranscriptEntry }
