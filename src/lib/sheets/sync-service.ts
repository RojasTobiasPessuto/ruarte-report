
import { getRange, appendRow, updateRow } from '../google-sheets';
import { SHEETS_CONFIG } from './config';
import { mapOpportunityToSheetRow } from './mapper';
import type { Opportunity, Sale, Contact, Payment } from '@/types';

export async function syncOpportunityToSheets(
  opportunity: Opportunity,
  sales: Sale[] = [],
  contact?: Contact,
  payment?: Payment
) {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) return { ok: false, error: 'No GOOGLE_SHEETS_ID' };

  const { TAB_NAME, COLUMNS } = SHEETS_CONFIG;

  try {
    // 1. Obtener datos actuales para buscar coincidencias (ID o Email)
    // Leemos las primeras 500 filas para agilizar
    const rows = await getRange(sheetId, `${TAB_NAME}!A2:AA500`);
    
    let existingRowIndex = -1;
    const currentGhlId = opportunity.ghl_contact_id;
    const currentEmail = opportunity.contact_email;
    const currentCallDate = opportunity.fecha_llamada 
      ? new Date(opportunity.fecha_llamada).toLocaleDateString('en-US')
      : '';

    // Si es un pago posterior (Cuota > 1), forzamos APPEND
    const isSubsequentPayment = payment && payment.nro_cuota && payment.nro_cuota > 1;

    if (!isSubsequentPayment) {
      // Buscar por ID (Col C = índice 2) o Email (Col B = índice 1)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowId = row[COLUMNS.CONTACT_ID];
        const rowEmail = row[COLUMNS.EMAIL];
        const rowCallDate = row[COLUMNS.FECHA_LLAMADA];

        const matchId = currentGhlId && rowId === currentGhlId;
        const matchEmail = currentEmail && rowEmail === currentEmail;

        if (matchId || matchEmail) {
          // Si coincide la fecha de llamada, es una ACTUALIZACIÓN
          if (rowCallDate === currentCallDate) {
            existingRowIndex = i + 1; // +1 porque el header es la fila 1 y el array empieza en A2
            break;
          }
          // Si la fecha es distinta, seguimos buscando por si hay otra fila más reciente
          // (Si no encontramos ninguna con la misma fecha, haremos Append de Reagenda)
        }
      }
    }

    // 2. Generar los datos de la fila
    const newRow = mapOpportunityToSheetRow(opportunity, sales, contact, payment);

    // 3. Ejecutar Acción Fragmentada (para evitar columnas protegidas)
    const token = await getAccessToken();
    const rowIndexToUse = existingRowIndex !== -1 ? existingRowIndex : rows.length + 1;
    const action = existingRowIndex !== -1 ? 'UPDATE' : 'APPEND';

    // Si es APPEND, manejamos la marca de [REAGENDA]
    if (action === 'APPEND' && !isSubsequentPayment && rows.some(r => r[COLUMNS.EMAIL] === currentEmail || r[COLUMNS.CONTACT_ID] === currentGhlId)) {
      newRow[COLUMNS.NOMBRE] = `[REAGENDA] ${newRow[COLUMNS.NOMBRE]}`;
    }

    // Definimos los bloques de datos según las columnas permitidas
    const blocks = [
      { range: `B${rowIndexToUse + 1}:P${rowIndexToUse + 1}`, values: [newRow.slice(1, 16)] },
      { range: `V${rowIndexToUse + 1}:Z${rowIndexToUse + 1}`, values: [newRow.slice(21, 26)] },
      { range: `AB${rowIndexToUse + 1}:AB${rowIndexToUse + 1}`, values: [[newRow[27]]] }
    ];

    // Ejecutamos cada bloque
    for (const block of blocks) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`${TAB_NAME}!${block.range}`)}?valueInputOption=USER_ENTERED`;
      await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: block.values })
      });
    }

    return { ok: true, action, rowIndex: rowIndexToUse + 1 };

  } catch (error) {
    console.error('Error in syncOpportunityToSheets:', error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
