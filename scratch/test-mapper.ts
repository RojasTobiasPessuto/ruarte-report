
import { mapOpportunityToSheetRow } from '../mapper';

// Mocks de datos para simular Supabase/GHL
const mockOpportunity: any = {
  id: 'opp_123',
  contact_email: 'mariano@prueba.com',
  contact_name: 'Mariano Ravazzola',
  ghl_contact_id: 'ghl_marian_001',
  fecha_llamada: '2026-02-18T10:00:00Z',
  closer: { name: 'Roberto C Ruarte' },
  estado_cita: 'Asistido',
  programa: 'Mastermind',
  situacion: 'Adentro en Seguimiento'
};

const mockContact: any = {
  country: 'MX',
  fuenteutm: 'RR',
  sdr: 'Landing'
};

const mockSale: any = {
  forma_pago: 'Pago Dividido',
  revenue: 12000,
  deposito_broker: 0,
  payment_type: { name: 'Transferencia' },
  payments: [
    { nro_cuota: 1, monto: 2000, pagado: true, fecha_pago: '2026-02-18', justificante_urls: ['http://comprobante1.com'] },
    { nro_cuota: 2, monto: 2000, pagado: true, fecha_pago: '2026-03-18', justificante_urls: ['http://comprobante2.com'] }
  ]
};

console.log('--- INICIANDO PRUEBAS UNITARIAS DEL MAPPER ---');

// TEST 1: AGENDA INICIAL (SOLO CONTACTO)
const rowAgenda = mapOpportunityToSheetRow(mockOpportunity, [], mockContact);
console.log('\nTEST 1: Agenda Inicial');
console.log('Fila generada:', rowAgenda);
console.log('Validación Nombre (Col D):', rowAgenda[3] === 'Mariano Ravazzola' ? '✅ OK' : '❌ ERROR');
console.log('Validación ID (Col C):', rowAgenda[2] === 'ghl_marian_001' ? '✅ OK' : '❌ ERROR');

// TEST 2: VENTA CERRADA (CUOTA 1)
const rowVenta = mapOpportunityToSheetRow(mockOpportunity, [mockSale], mockContact);
console.log('\nTEST 2: Venta Cerrada (Cuota 1)');
console.log('Validación Revenue (Col N):', rowVenta[13] === 12000 ? '✅ OK' : '❌ ERROR');
console.log('Validación Cash (Col O):', rowVenta[14] === 2000 ? '✅ OK' : '❌ ERROR');
console.log('Validación Cuota (Col U):', rowVenta[20] === 'Cuota 1' ? '✅ OK' : '❌ ERROR');

// TEST 3: CUOTA POSTERIOR (CUOTA 2)
const rowCuota2 = mapOpportunityToSheetRow(mockOpportunity, [mockSale], mockContact, mockSale.payments[1]);
console.log('\nTEST 3: Cuota 2 (Pago Dividido)');
console.log('Validación ID (Col C):', rowCuota2[2] === 'Pago Dividido' ? '✅ OK' : '❌ ERROR');
console.log('Validación Revenue (Col N):', rowCuota2[13] === '' ? '✅ OK' : '❌ ERROR (Debe ser vacío)');
console.log('Validación Situación (Col L):', rowCuota2[11] === '' ? '✅ OK' : '❌ ERROR (Debe ser vacío)');
console.log('Validación Cash (Col O):', rowCuota2[14] === 2000 ? '✅ OK' : '❌ ERROR');
console.log('Validación Cuota (Col U):', rowCuota2[20] === 'Cuota 2' ? '✅ OK' : '❌ ERROR');

console.log('\n--- PRUEBAS FINALIZADAS ---');
