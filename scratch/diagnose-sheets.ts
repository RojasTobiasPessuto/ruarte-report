
import { getAccessToken } from '../src/lib/google-sheets'

async function diagnose() {
  const sheetId = process.env.GOOGLE_SHEETS_ID
  console.log('Sheet ID en .env:', sheetId)
  
  if (!sheetId) {
    console.error('ERROR: No hay GOOGLE_SHEETS_ID en el entorno.')
    return
  }

  try {
    const token = await getAccessToken()
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!res.ok) {
      console.error(`Error de conexión (${res.status}):`, await res.text())
      return
    }

    const data = await res.json()
    console.log('--- DIAGNÓSTICO EXITOSO ---')
    console.log('Nombre del Documento:', data.properties.title)
    console.log('Pestañas encontradas:', data.sheets.map((s: any) => s.properties.title).join(', '))
  } catch (err) {
    console.error('Error fatal durante el diagnóstico:', err)
  }
}

// Para ejecutar esto en Next.js/Node
diagnose()
