
export const SHEETS_CONFIG = {
  TAB_NAME: 'CRM Agendas',
  // Índices basados en 0 (A=0, B=1, ...)
  COLUMNS: {
    // Bloque B-P (Índices 1-15)
    EMAIL: 1,           // B
    CONTACT_ID: 2,      // C
    NOMBRE: 3,          // D
    PAISES: 4,          // E
    FECHA_LLAMADA: 5,   // F
    CLOSERS: 6,         // G
    SOURCES: 7,         // H
    SETTERS: 8,         // I
    PRESENTADO: 9,      // J
    OFFERS: 10,         // K
    SITUACION: 11,      // L
    DEALS: 12,          // M
    REVENUE: 13,        // N
    CASH: 14,           // O
    BROKER: 15,         // P
    
    // Bloque V-Z (Índices 21-25)
    TIPO_PAGO: 21,      // V
    JUSTIFICANTE: 22,   // W
    TXID: 23,           // X
    CODIGO_TRANS: 24,   // Y
    CUENTAS: 25,        // Z

    // Bloque AB (Índice 27)
    FECHA_PAGO: 27      // AB
  },
  // Columnas que NO debemos tocar bajo ninguna circunstancia
  FORBIDDEN_COLUMNS: [0, 16, 17, 18, 19, 20, 26] 
};
