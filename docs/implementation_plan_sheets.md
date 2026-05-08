# Plan Maestro: Sincronización Directa Google Sheets

Este plan detalla la arquitectura técnica y el mapeo de datos para centralizar la sincronización de Google Sheets en el sistema Ruarte Reports.

## 1. Estrategia de Ramas y Despliegue
*   **Rama de Trabajo**: `develop-test`.
*   **Seguridad**: No se toca `main` ni el Sheet de producción hasta validación total en una **Hoja de Prueba**.

## 2. Arquitectura de Archivos (Estructura de Carpetas)
src/lib/
├── google-sheets.ts       # Extenderemos este archivo con appendRow/updateRow
├── sheets/
│   ├── sync-service.ts    # Orquestador de lógica Dashboard
│   ├── mapper.ts          # Conversor de tipos Supabase -> Sheets
│   └── config.ts          # Indices de columnas A-AA

## 3. Procesos y Lógica de Negocio

### Registro y Actualización de Lead (Lógica de Identificación)
1.  **Búsqueda Redundante**: El sistema buscará en el Sheet usando una lógica de `OR`:
    *   Primero busca por `Contact ID` (Columna C).
    *   Si no hay coincidencia, busca por `Email` (Columna B).
2.  **Jerarquía de Fuentes (Single Source of Truth)**:
    *   **Prioridad 1: Supabase**. Todo lo que el sistema ya procesó (Datos del formulario, montos, cuotas, estados corregidos).
    *   **Prioridad 2: GoHighLevel**. Solo para datos que el sistema no gestiona directamente (SDR, Fuente-UTM original, etc.).

### Lógica de Reagendas
Si se encuentra una coincidencia por ID o Email, se añade una nueva fila marcada como **"[REAGENDA]"**.

### Sincronización Financiera (Post-Agenda)
1.  **Trigger**: Al guardar en `/api/opportunities/[id]`.
2.  **Consolidación**: Se extrae `Revenue`, `Cash` y `Justificante` directamente de Supabase.

## 4. Mapeo de Columnas Detallado (Pestaña CRM Agendas)

| Col. | Nombre en Sheet | Fuente Prioritaria | Clave / Lógica |
| :--- | :--- | :--- | :--- |
| **A** | Business | Constante | "Cliente" |
| **B** | Email | **Supabase** | `opportunity.contact_email` |
| **C** | Contact ID | **GHL** | ID de Contacto de GHL |
| **D** | Nombre | **Supabase** | `opportunity.contact_name` (Dato corregido) |
| **E** | Paises | **Supabase** | `contact.country` |
| **F** | Fecha Llamada | **Supabase** | `opportunity.fecha_llamada` |
| **G** | Closers | **Supabase** | `opportunity.closer.name` |
| **H** | Sources | **GHL** | `contact.fuenteutm` (Fuente-UTM) |
| **I** | Setters | **GHL** | `contact.sdr` (04. SDR) |
| **J** | Presentado | **Supabase** | `opportunity.estado_cita` |
| **K** | Offers | **Supabase** | `opportunity.programa` |
| **L** | Situacion | **Supabase** | `opportunity.situacion` |
| **M** | Deals | **Supabase** | `sale.forma_pago` |
| **N** | Revenue | **Supabase** | `sale.revenue` |
| **O** | Cash | **Supabase** | `sale.cash` (Pago 1) |
| **P** | Depósito en Broker | **Supabase** | `sale.deposito_broker` |
| **U** | Pagos | **Supabase** | Nro Cuota actual |
| **V** | Tipo de Pago | **Supabase** | `payment_type.name` |
| **W** | Justificante | **Supabase** | URL del archivo subido |
| **X** | TXID | **Supabase** | ID de transacción de la app |
| **Z** | Cuentas | **GHL/Logic** | Basado en Fuente (RR / TR) |
| **AA** | Fecha de Pago | **Supabase** | `payment.fecha_pago` |

## 5. Pasos de Construcción (Fases de Desarrollo)

### Fase 1: Infraestructura y Autenticación
1.  Crear rama `develop-test`.
2.  Extender `src/lib/google-sheets.ts`: Añadir métodos `appendRow` y `getRowIndex`.

**Fase 1: Ejecutada [08/05/2026]**
*   **Rama de Trabajo**: Creada y activa la rama `develop-test`.
*   **Extensión de Librería**: Se añadieron `getRange`, `appendRow` y se exportó `getAccessToken` en `src/lib/google-sheets.ts`.
*   **Configuración de Entorno**: Se actualizó `.env.local` para apuntar al ID de la Hoja de Prueba (`1WKIaFAYiqfT4GWhQNCtxLKEH-qBcnw47AXzah-d5aWE`).
*   **Verificación**: Se ejecutó un script de diagnóstico exitoso confirmando la conexión con la hoja "Dashboard KPIs (Test)" y detectando la pestaña oficial "CRM Agendas".

### Fase 2: El Transformador de Datos (Mapper)
1.  Implementar `mapper.ts`: Función que genera el array de 27 posiciones (A-AA).
2.  Codificar el **Router Financiero**: Lógica para separar Revenue, Cash y Broker.

**Fase 2: Ejecutada [08/05/2026]**
*   **Modularización**: Se creó la carpeta `src/lib/sheets/` para centralizar la lógica.
*   **Configuración Estricta**: Se creó `config.ts` con los índices fijos de las 27 columnas (A-AA).
*   **Lógica de Transformación**: Se implementó `mapper.ts` integrando datos de Oportunidad, Venta, Contacto y Pagos de Supabase.
*   **Automatizaciones Incluidas**: 
    - Lógica de detección de Cuentas (RR / TR).
    - Router financiero (Revenue/Cash del primer pago).
    - Priorización de datos corregidos en el sistema sobre los originales de GHL.

### Fase 3: Pruebas Unitarias Automatizadas
1.  Crear scripts de prueba en `src/lib/sheets/__tests__/`.
2.  Validar el Mapper y la lógica de Cuentas localmente.

**Fase 3: Ejecutada [08/05/2026]**
*   **Validación del Mapper**: Se validaron los casos de Agendas, Ventas (Cuota 1) y Cuotas 2+ (Pago Dividido).
*   **Confirmación de Lógica**: Verificado el vaciado de Revenue en cuotas posteriores para evitar duplicidad de métricas.

### Fase 4: Integración con los Triggers
1.  **Trigger Manual**: Inyectar en `/api/opportunities/[id]`.
2.  **Trigger Automático**: Vincular en `ghl-sync-single.ts`.

**Fase 4: Ejecutada [08/05/2026]**
*   **Motor Implementado**: `sync-service.ts` activo con lógica de búsqueda redundante y reagendas.
*   **Conexión Endpoints**: Integrado exitosamente en el Webhook de GHL y en la API de Oportunidades del sistema.

### Fase 5: Simulacro de Ciclo Completo (E2E)
1.  Simular Vida del Lead: Nacimiento -> Evolución -> Venta.
2.  Validación Campo por Campo.
3.  Protocolo de Limpieza Final en la Google Sheet.

## 6. Validación Final y Comparativa
1.  Comparar contra registros históricos de Make.
