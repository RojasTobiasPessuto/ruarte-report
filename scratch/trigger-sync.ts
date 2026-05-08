
import { syncOpportunityToSheets } from './src/lib/sheets/sync-service';
import { createServiceRoleClient } from './src/lib/supabase/server';
import { getOpportunity } from './src/lib/ghl';

async function triggerSync() {
  const ghlOpportunityId = 'Sc7Q9vF8QYBUOmo7Xa3l'; // El ID que creamos recién
  
  console.log('--- DISPARANDO SINCRONIZACIÓN MANUAL ---');
  console.log('Buscando oportunidad en GHL...');
  
  try {
    const opp = await getOpportunity(ghlOpportunityId);
    if (!opp) throw new Error('Oportunidad no encontrada en GHL');

    console.log('Oportunidad encontrada:', opp.name);
    console.log('Mapeando y enviando a Google Sheets...');

    // Simulamos los datos que vendrían de la DB
    const mockOpp: any = {
      ghl_contact_id: opp.contactId,
      contact_email: opp.contact?.email || 'claude_e2e@ruartereports.com',
      contact_name: opp.contact?.name || 'Claude Real E2E Test',
      fecha_llamada: new Date().toISOString(),
      estado_cita: 'Pendiente',
      programa: 'Mastermind',
      situacion: 'Post Llamada',
      id: 'test_manual_sync_001'
    };

    const result = await syncOpportunityToSheets(mockOpp, [], undefined);
    console.log('Resultado de Sincronización:', result);

  } catch (err) {
    console.error('Error en sincronización manual:', err);
  }
}

triggerSync();
