
import { SHEETS_CONFIG } from './config';
import type { Opportunity, Sale, Contact, Payment } from '@/types';

/**
 * Transforma los datos de una oportunidad o un pago específico en una fila para Google Sheets (27 columnas).
 */
export function mapOpportunityToSheetRow(
  opportunity: Opportunity,
  sales: Sale[] = [],
  contact?: Contact,
  payment?: Payment
): (string | number | boolean | null)[] {
  // Inicializar fila con 28 columnas vacías (hasta AB)
  const row = new Array(28).fill('');
  const { COLUMNS } = SHEETS_CONFIG;

  // Determinar si estamos mapeando una Cuota 1 (con oportunidad) o una Cuota posterior
  const isSubsequentPayment = payment && payment.nro_cuota && payment.nro_cuota > 1;
  const mainSale = sales[0]; // Tomamos la venta más reciente

  // 1. Datos Identificatorios y de Contacto (BLOQUE B-E)
  row[COLUMNS.EMAIL] = opportunity.contact_email || '';
  row[COLUMNS.NOMBRE] = opportunity.contact_name || '';
  
  if (isSubsequentPayment) {
    row[COLUMNS.CONTACT_ID] = 'Pago Dividido';
  } else {
    row[COLUMNS.CONTACT_ID] = opportunity.ghl_contact_id || '';
  }

  if (contact) {
    row[COLUMNS.PAISES] = (contact as any).country || '';
    row[COLUMNS.SOURCES] = (contact as any).fuenteutm || '';
    row[COLUMNS.SETTERS] = (contact as any).sdr || '';
  }

  // 2. Datos de la Oportunidad (BLOQUE F-P)
  // Solo se cargan si es la Cuota 1 (o no es un pago dividido)
  if (!isSubsequentPayment) {
    row[COLUMNS.FECHA_LLAMADA] = opportunity.fecha_llamada 
      ? new Date(opportunity.fecha_llamada).toLocaleDateString('en-US') 
      : '';
    row[COLUMNS.PRESENTADO] = opportunity.estado_cita || '';
    row[COLUMNS.SITUACION] = opportunity.situacion || '';
    if (mainSale) {
      row[COLUMNS.REVENUE] = Number(mainSale.revenue) || 0;
      row[COLUMNS.BROKER] = Number(mainSale.deposito_broker) || 0;
    }
  }

  // 3. Datos comunes de Venta/Closer
  row[COLUMNS.CLOSERS] = opportunity.closer?.name || '';
  row[COLUMNS.OFFERS] = opportunity.programa || '';
  row[COLUMNS.TXID] = opportunity.id;

  // 4. Lógica de Pago Específico (BLOQUE V-AB)
  if (mainSale) {
    row[COLUMNS.DEALS] = mainSale.forma_pago || '';
    row[COLUMNS.TIPO_PAGO] = (mainSale as any).payment_type?.name || '';
    
    const p = payment || mainSale.payments?.find(p => p.pagado && p.nro_cuota === 1);
    
    if (p) {
      row[COLUMNS.CASH] = Number(p.monto) || 0;
      row[COLUMNS.JUSTIFICANTE] = p.justificante_urls?.[0] || '';
      row[COLUMNS.CODIGO_TRANS] = (p as any).forma_pago || ''; // Col Y
      row[COLUMNS.FECHA_PAGO] = p.fecha_pago // Col AB
        ? new Date(p.fecha_pago).toLocaleDateString('en-US')
        : '';
    }
  }

  return row;
}
