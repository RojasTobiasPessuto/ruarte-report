
// Lógica del Mapper copiada para el Test
const SHEETS_CONFIG = {
  COLUMNS: {
    BUSINESS: 0, EMAIL: 1, CONTACT_ID: 2, NOMBRE: 3, PAISES: 4, FECHA_LLAMADA: 5,
    CLOSERS: 6, SOURCES: 7, SETTERS: 8, PRESENTADO: 9, OFFERS: 10, SITUACION: 11,
    DEALS: 12, REVENUE: 13, CASH: 14, BROKER: 15, PAGOS: 20, TIPO_PAGO: 21,
    JUSTIFICANTE: 22, TXID: 23, CUENTAS: 25, FECHA_PAGO: 26
  }
};

function mapOpportunityToSheetRow(opportunity, sales = [], contact, payment) {
  const row = new Array(27).fill('');
  const { COLUMNS } = SHEETS_CONFIG;
  const isSubsequentPayment = payment && payment.nro_cuota && payment.nro_cuota > 1;
  const mainSale = sales[0];

  row[COLUMNS.BUSINESS] = 'Cliente';
  row[COLUMNS.EMAIL] = opportunity.contact_email || '';
  row[COLUMNS.NOMBRE] = opportunity.contact_name || '';
  
  if (isSubsequentPayment) {
    row[COLUMNS.CONTACT_ID] = 'Pago Dividido';
  } else {
    row[COLUMNS.CONTACT_ID] = opportunity.ghl_contact_id || '';
  }

  if (contact) {
    row[COLUMNS.PAISES] = contact.country || '';
    row[COLUMNS.SOURCES] = contact.fuenteutm || '';
    row[COLUMNS.SETTERS] = contact.sdr || '';
  }

  if (!isSubsequentPayment) {
    row[COLUMNS.FECHA_LLAMADA] = opportunity.fecha_llamada;
    row[COLUMNS.PRESENTADO] = opportunity.estado_cita || '';
    row[COLUMNS.SITUACION] = opportunity.situacion || '';
    if (mainSale) {
      row[COLUMNS.REVENUE] = mainSale.revenue || 0;
    }
  }

  row[COLUMNS.CLOSERS] = (opportunity.closer && opportunity.closer.name) || '';
  row[COLUMNS.OFFERS] = opportunity.programa || '';
  row[COLUMNS.TXID] = opportunity.id;

  if (mainSale) {
    row[COLUMNS.DEALS] = mainSale.forma_pago || '';
    const p = payment || (mainSale.payments && mainSale.payments.find(p => p.nro_cuota === 1));
    if (p) {
      row[COLUMNS.CASH] = p.monto || 0;
      row[COLUMNS.FECHA_PAGO] = p.fecha_pago;
      row[COLUMNS.PAGOS] = `Cuota ${p.nro_cuota}`;
    }
  }

  return row;
}

// DATOS DE PRUEBA (Caso Mariano Ravazzola)
const mockOpp = { id: 'opp_123', contact_email: 'mariano@prueba.com', contact_name: 'Mariano Ravazzola', ghl_contact_id: 'SS6hQiuNZtDCgkKQtoZb', fecha_llamada: '12/4/2025', closer: { name: 'Roberto C Ruarte' }, estado_cita: 'Asistido', programa: 'Mastermind', situacion: 'Adentro en Seguimiento' };
const mockContact = { country: 'MX', fuenteutm: 'RR', sdr: 'Landing' };
const mockSale = { forma_pago: 'Pago Dividido', revenue: 12000, payments: [
  { nro_cuota: 1, monto: 2000, fecha_pago: '02/18/2026' },
  { nro_cuota: 2, monto: 2000, fecha_pago: '01/21/2026' }
]};

console.log('--- TEST MAPPER: CASO MARIANO ---');

const r1 = mapOpportunityToSheetRow(mockOpp, [mockSale], mockContact);
console.log('\nFILA COMPLETA - CUOTA 1:');
console.log(JSON.stringify(r1, null, 2));

const r2 = mapOpportunityToSheetRow(mockOpp, [mockSale], mockContact, mockSale.payments[1]);
console.log('\nFILA COMPLETA - CUOTA 2:');
console.log(JSON.stringify(r2, null, 2));
