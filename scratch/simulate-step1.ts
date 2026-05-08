
import { syncOpportunityToSheets } from './src/lib/sheets/sync-service';

async function simulate() {
  console.log('--- SIMULACRO PASO 1: AGENDA NUEVA ---');
  
  const mockOpp: any = {
    id: 'test_opp_001',
    contact_email: 'claude_test@ruartereports.com',
    contact_name: 'Claude Test Simulation',
    ghl_contact_id: 'ghl_sim_001',
    fecha_llamada: new Date().toISOString(), // Hoy
    closer: { name: 'Roberto C Ruarte' },
    estado_cita: 'Pendiente',
    programa: 'Mastermind',
    situacion: 'Post Llamada'
  };

  const mockContact: any = {
    country: 'AR',
    fuenteutm: 'RR_Simulation',
    sdr: 'Claude AI'
  };

  try {
    const result = await syncOpportunityToSheets(mockOpp, [], mockContact);
    console.log('Resultado:', result);
    if (result.ok) {
      console.log('\n✅ ÉXITO: El lead debería aparecer ahora mismo en la pestaña "CRM Agendas".');
    }
  } catch (err) {
    console.error('Error en el simulacro:', err);
  }
}

simulate();
