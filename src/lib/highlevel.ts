const HIGHLEVEL_API_BASE = 'https://services.leadconnectorhq.com'

interface HighLevelContact {
  id: string;
  contactName: string;
  email: string;
  phone: string;
}

export async function searchContact(query: string): Promise<HighLevelContact | null> {
  const response = await fetch(
    `${HIGHLEVEL_API_BASE}/contacts/search/duplicate?locationId=${process.env.HIGHLEVEL_LOCATION_ID}&email=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.HIGHLEVEL_API_KEY}`,
        'Version': '2021-07-28',
      },
    }
  )

  if (!response.ok) return null

  const data = await response.json()
  if (data.contacts && data.contacts.length > 0) {
    const contact = data.contacts[0]
    return {
      id: contact.id,
      contactName: contact.contactName || contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
    }
  }
  return null
}

export async function sendMessage(contactId: string, message: string): Promise<boolean> {
  const response = await fetch(
    `${HIGHLEVEL_API_BASE}/conversations/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HIGHLEVEL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        type: 'Email',
        contactId,
        message,
      }),
    }
  )

  return response.ok
}

export async function sendCallSummaryNotification(
  contactEmail: string,
  contactName: string,
  summaryUrl: string
): Promise<boolean> {
  const contact = await searchContact(contactEmail)
  if (!contact) {
    console.error(`Contact not found in HighLevel: ${contactEmail}`)
    return false
  }

  const message = `Hola ${contactName},\n\nGracias por tu tiempo en nuestra llamada. Aquí podés ver un resumen de lo que conversamos:\n\n${summaryUrl}\n\nSi tenés alguna consulta, no dudes en escribirnos.\n\n¡Saludos!`

  return sendMessage(contact.id, message)
}
