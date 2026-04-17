# Ruarte Report — Plan Completo

**Módulo: Oportunidades, Pipeline, Ventas y Pagos**

---

## Contexto

Integrar el pipeline "Agendas" de GoHighLevel con Ruarte Report mediante polling periódico a la API (no webhooks desde GHL). Los closers ven sus oportunidades en el sistema, llenan el formulario post-agenda desde la app (reemplazando el form de GHL), registran ventas y cuotas. Todo se conecta con los leads de ManyChat y las llamadas de Fathom a través de una tabla `Contact` central, con un sistema de roles granular. Las automatizaciones de GHL dejan de usarse: la app dispara un webhook saliente con toda la data de la venta/pago (listo para conectar con Make/Sheets/Zapier en el futuro).

---

## Decisiones clave

- **Roles como tabla** con permisos granulares (no enum)
- **Contact como tabla central** que unifica ManyChat + GHL + Fathom
- **Opportunity**, **Sale**, **Payment**, **PaymentType** son tablas separadas (soporta recompras y mantiene historial completo de cuotas)
- **Closer** separado de **AppUser** (permite closers sin cuenta de login)
- **Cálculo de monto_restante** dinámico: `revenue - SUM(payments pagados)` (evita drift de datos)
- **Closer solo crea pagos**, admin puede editar/eliminar
- **Webhook saliente**: la app dispara POST a una URL configurable con toda la data (conectable a Make/Sheets más adelante)
- **Campos legacy de Opportunity** (revenue, cash, etc.): se mantienen en DB pero ocultos en UI
- **Automatizaciones GHL**: se desactivan porque ya no llenamos esos custom fields desde la app

---

## Diagrama de Clases

Ubicación: `docs/class-diagram-compact.puml`

**Entidades:**
- **Role** — permisos granulares
- **AppUser** — usuario de login (referencia Role y Closer)
- **Closer** — datos operativos del vendedor (ghl_user_id, fathom_email)
- **Contact** — identidad unificada (centro de trazabilidad)
- **Lead** — journey de ManyChat (tags/ángulos)
- **Call** — grabación Fathom
- **CallAnalysis** — análisis Claude
- **Opportunity** — oportunidad GHL + formulario post-agenda (solo pipeline)
- **Sale** — venta total (revenue, forma_pago, completada)
- **Payment** — cuota individual (monto, fecha, pagado)
- **PaymentType** — catálogo (Stripe, Transfer, Crypto, Cash, Deposito)

---

## Sistema de Roles

| Rol | Permisos principales |
|---|---|
| **admin** | Todo: gestiona usuarios, closers, leads, ve todas las métricas |
| **manager** | Ve todo (incl. pagos), no gestiona usuarios/settings |
| **closer** | Solo sus oportunidades/llamadas, llena post-agenda, crea pagos (no edita) |
| **setter** | Solo sus agendas, sin post-agenda, sin pagos |

### Permisos granulares en Role

- **Globales**: `can_view_all`, `can_manage_users`, `can_manage_closers`, `can_view_leads`, `can_manage_leads`, `can_import`
- **Pipeline**: `can_view_all_opportunities`, `can_fill_post_agenda`
- **Ventas/Pagos**: `can_create_payment`, `can_edit_payment`, `can_view_all_payments`
- **Llamadas**: `can_view_all_calls`

---

## Contact (Centro de trazabilidad)

Unifica identidad del lead:
- **manychat_subscriber_id** (ManyChat)
- **ghl_contact_id** (GoHighLevel)
- **email / phone / ig_username** (matching cross-system)

Match automático por: `ghl_contact_id` → `ig_username` → `email` → `phone`

---

## Flujo de Vinculación Automática

1. **ManyChat**: Webhook → busca/crea Contact por ig_username/phone → crea Lead
2. **GHL**: Cron → busca/crea Contact por ghl_contact_id/email/phone/ig → crea Opportunity → vincula lead_id del mismo Contact
3. **Fathom**: Cron → busca/crea Contact por email/phone → crea Call → vincula con Opportunity del mismo Contact + closer

---

## GHL API — Datos reales

**Pipeline:** Agendas (`P6LRnutPF60CchJsrHn1`) — 407 oportunidades actuales

### Stages

| Stage | GHL ID |
|---|---|
| Agendado (Nuevo) | `79487648-2abb-43e3-a33c-47e2d71a2b05` |
| Agendado (Confirmado) | `ce5d8854-20d1-41c5-8790-9a21b4601ed4` |
| Post Llamada | `ee2296bf-08ca-49a0-a558-10ae67f01b9b` |
| ReAgendado | `9a584cbb-cc95-4e7c-b50b-f4e0712f9ae5` |
| Seguimiento | `dcc40faa-4532-4262-92a0-fc4c17aad231` |
| Compro | `550bd49c-1a4a-4d71-9709-675bd7a02729` |
| No Compro | `07f279fc-e929-4a8e-8c66-f831736cf216` |
| Cancelado | `db174649-c13b-4eb9-810e-935099d0d225` |
| No Asistio | `61bc8479-8c99-446a-ba92-2b49018e9733` |

### Custom Fields

| Campo | GHL Field ID | Destino en DB |
|---|---|---|
| Estado Cita | `essLeEclPsiKtqcpuJmD` | Opportunity.estado_cita |
| Closer | `mPNJalOIkmCMpjkPF0gh` | (matching a Closer) |
| Fecha Llamada | `uNhk9ZcwgHp1fg64AlIA` | Opportunity.fecha_llamada |
| Programa | `2NBw0DTGoNoWL6WGuTl9` | Opportunity.programa |
| Situacion | `4N5KNDWhZL3hmi4PXMts` | Opportunity.situacion |
| Descripción | `6OEevrUIc55XMulEaNqW` | Opportunity.descripcion_llamada |
| Forma Pago | `fPUDEPzYiIAZakBZ62sM` | Sale.forma_pago |
| Tipo Pago | `PzCUwVoF9ftt8UQqtnoe` | Sale.payment_type_id |
| Revenue | `I0hZDYqraA1gfDHDpMsI` | Sale.revenue |
| Cash | `YfebFtMdsckkfDayHolB` | Payment (cada cuota) |
| Depósito Broker | `FOy85vmxC9wnkv1lnhL1` | Sale.deposito_broker |
| Justificante | `mhFZw84ryROj1szlCVZ4` | Sale.justificante_url |
| Código Transacción | `c2DoGzzcaQnYH471abTo` | Sale.codigo_transaccion |
| Cantidad Cuotas | `A6frS2Zi1STk66ty24B1` | Sale.cantidad_cuotas |
| Nro Cuota | `P5AMOretf47E3IkQbKBj` | Payment.nro_cuota |
| Fecha Pago | `JGvrWkDVF2Cy8fRyixKZ` | Payment.fecha_pago |
| Fecha Próximo Pago | `CLakZgktYtyXFLxmND4D` | Payment.fecha_proximo_pago |
| Monto Restante | `Y3x3aaMS27mdQSU3gpO4` | (calculado) |
| Seguimiento | `gJ9Iv4P3B7OWtQidfu7z` | Opportunity.fecha_seguimiento |
| Respuesta Calendar | `A9dct55A4iyGOMgVXnbA` | Opportunity.respuesta_calendario |

### GHL User IDs

- Hernan Grando → `C2SwzhFR5qWW3F7CC7WP`
- Patricio Rocha → `UFjkz8kaKGQDpRCTBE5u`

### Custom Field del Contacto

`contact.qu_volumen_aproximado_de_capital_real_ests_destinando_o_evaluando_destinar_a_inversin` → Opportunity.volumen_real

---

## Campos legacy en Opportunity (mantener en DB, ocultar en UI)

Se mantienen con datos históricos pero no se usan para nuevas ventas ni se muestran en la UI:

- `legacy_forma_pago`, `legacy_tipo_pago`, `legacy_revenue`, `legacy_cash`
- `legacy_deposito_broker`, `legacy_monto_restante`, `legacy_codigo_transaccion`
- `legacy_cantidad_cuotas`

Las nuevas ventas viven en `Sale` y `Payment`.

---

## Formulario Post-Agenda

### Campos siempre visibles

- Estado de la Cita
- Closer (auto)
- Fecha Llamada
- Programa
- Situación
- Descripción de Llamada
- Volumen Real

### Reglas de visibilidad dinámica

| SITUACIÓN | PROGRAMA | CAMPOS ADICIONALES |
|---|---|---|
| Vacío / Perdido | Cualquiera | Ninguno |
| Seguimiento | Cualquiera | + Fecha próximo Seguimiento |
| Adentro en Llamada / Adentro en Seguimiento / ReCompra | Mastermind / Formación / Programa PLUS / No Califica | + Forma Pago, Tipo Pago, Revenue, Cash, Justificante, Cód. Trans. + Cuotas si Pago Dividido/Fee |
| Adentro en Llamada / Adentro en Seguimiento / ReCompra | LITE / PAMM | + Depósito en Broker, Justificante (NO Revenue, Cash, Tipo Pago) |

### Sub-reglas de Forma de Pago

- **Pago Completo** → Revenue, Cash (= Revenue). OCULTA Cuotas
- **Pago Dividido / Fee** → Revenue, Cash (1ra cuota), Cantidad Cuotas, Fecha Próximo Pago
- **Pago Programado** → Solo Revenue. OCULTA Cuotas y Fecha Próximo Pago
- **Deposito** → Solo Depósito Broker. OCULTA Revenue/Cash

### Movimiento automático de Stage

| Situación | Stage |
|---|---|
| Seguimiento | Seguimiento |
| Adentro en Llamada | Compro |
| Adentro en Seguimiento | Compro |
| ReCompra | Compro |
| Perdido | No Compro |
| Estado = Cancelada | Cancelado |
| Estado = No Asistido | No Asistio |

### Al guardar el form (Sale + Payments)

**Pago Completo:**
- Sale.revenue = X, Sale.completada = true
- Payment: 1 registro (monto=X, pagado=true, fecha=hoy)

**Pago Dividido / Fee:**
- Sale.revenue = X, Sale.cantidad_cuotas = N
- Payment #1: monto = primera cuota, pagado=true, fecha=hoy
- monto_restante = X - primera cuota (calculado)

**Pago Programado:**
- Sale.revenue = X, Sale.completada = false
- Sin Payments inmediatos

**Deposito:**
- Sale.revenue = 0, Sale.deposito_broker = X
- Sin Payments

### Flujo de segunda cuota en adelante

1. Closer entra al detalle de Sale → botón "Agregar pago"
2. Ingresa: monto, fecha_pago, fecha_proximo_pago
3. Se crea Payment #N con pagado=true
4. `monto_restante` se recalcula dinámicamente: `revenue - SUM(payments pagados)`
5. Si `monto_restante = 0` → `Sale.completada = true`
6. Sync a GHL: actualiza Cash (último monto), Nro Cuota, Fecha Pago, Monto Restante
7. Dispara webhook saliente con toda la data

---

## Sync con GHL (Cron cada 15 min)

**Lectura (GHL → App):**
1. `GET /opportunities/search?pipeline_id=P6LRnutPF60CchJsrHn1`
2. Por cada oportunidad:
   - Busca/crea Contact
   - Busca Lead del mismo Contact → vincula lead_id
   - Match closer por assignedTo → ghl_user_id
   - Busca Call del mismo Contact + closer → vincula call_id
   - Crea/actualiza Opportunity

**Escritura (App → GHL):**
- Al guardar form post-agenda: `PUT /opportunities/{id}` con custom fields + stage
- Al agregar pago: actualiza Cash, Nro Cuota, Fecha Pago, Monto Restante en GHL

---

## Webhook saliente

La app dispara un POST HTTP a una URL configurable por env var cuando:
- Se completa el formulario post-agenda
- Se agrega un pago nuevo
- Se marca una Sale como completada

**URL destino:** `process.env.OUTBOUND_WEBHOOK_URL` (dejar vacía por ahora, se configura después para Make/Zapier/Sheets)

**Payload del webhook (JSON):**

```json
{
  "event": "sale.created | payment.created | sale.completed | opportunity.updated",
  "timestamp": "2026-04-20T15:30:00Z",
  "opportunity": {
    "id": "uuid",
    "ghl_opportunity_id": "...",
    "pipeline_stage": "Compro",
    "estado_cita": "Asistido",
    "programa": "Mastermind",
    "situacion": "Adentro en Llamada",
    "descripcion_llamada": "...",
    "volumen_real": 5000,
    "fecha_llamada": "..."
  },
  "contact": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "ig_username": "..."
  },
  "closer": {
    "name": "Hernan Grando",
    "email": "..."
  },
  "sale": {
    "id": "uuid",
    "forma_pago": "Pago Dividido",
    "tipo_pago": "Stripe",
    "revenue": 1000,
    "monto_restante": 700,
    "cantidad_cuotas": 4,
    "deposito_broker": 0,
    "codigo_transaccion": "...",
    "completada": false
  },
  "payment": {
    "nro_cuota": 1,
    "monto": 300,
    "fecha_pago": "2026-04-20",
    "fecha_proximo_pago": "2026-05-20",
    "pagado": true
  }
}
```

**Configuración:**
- Env var `OUTBOUND_WEBHOOK_URL` (opcional)
- Env var `OUTBOUND_WEBHOOK_SECRET` (header `X-Webhook-Secret` para autenticación)
- Si `OUTBOUND_WEBHOOK_URL` está vacía → no se dispara (no error)
- Log de cada envío (success/fail) para debug

---

## Matriz de Permisos

| Sección | Admin | Manager | Closer | Setter |
|---|---|---|---|---|
| Dashboard | Todo | Todo | Suyo | -- |
| Llamadas | Todas | Todas | Suyas | -- |
| Closers | CRUD | Ver | -- | -- |
| Leads | Todo | Ver | -- | -- |
| Pipeline | Todo | Todo | Suyo | Suyo* |
| Post-Agenda Form | Todo | Todo | Suyo | -- |
| Ventas | Todo | Ver | Suyas | -- |
| Pagos (crear) | Sí | No | Sus ventas | -- |
| Pagos (editar) | Sí | No | No | -- |
| Importar | Sí | -- | -- | -- |
| Settings | Sí | -- | -- | -- |

*Setter ve sus agendas pero NO puede llenar post-agenda

---

## Archivos a crear

### Backend

1. `src/lib/ghl.ts` — Cliente GHL API
2. `src/lib/outbound-webhook.ts` — Disparador de webhook saliente
3. `src/app/api/cron/ghl/route.ts` — Cron sync
4. `src/app/api/opportunities/[id]/route.ts` — PATCH form post-agenda
5. `src/app/api/sales/[id]/route.ts` — CRUD Sale
6. `src/app/api/sales/[id]/payments/route.ts` — POST pago (closer/admin), PATCH/DELETE (solo admin)
7. `src/app/api/contacts/match/route.ts` — Helper de matching

### Páginas

8. `src/app/dashboard/pipeline/page.tsx` — Vista Kanban por etapa (filtrado por rol)
9. `src/app/dashboard/pipeline/[id]/page.tsx` — Detalle oportunidad + form post-agenda + ventas + pagos
10. `src/app/dashboard/payments/page.tsx` — Vista global de pagos/cuotas (admin/manager)

### Componentes

11. `src/components/pipeline/pipeline-board.tsx` — Kanban
12. `src/components/pipeline/opportunity-card.tsx`
13. `src/components/pipeline/post-agenda-form.tsx` — Form dinámico (reglas visibilidad)
14. `src/components/pipeline/sale-detail.tsx` — Detalle de venta
15. `src/components/pipeline/payment-list.tsx` — Lista de cuotas
16. `src/components/pipeline/add-payment-dialog.tsx` — Modal para agregar cuota

### Modificar

17. `src/types/index.ts` — Role, Contact, Opportunity, Sale, Payment, PaymentType interfaces + update AppUser, Closer
18. `src/components/layout/sidebar.tsx` — Agregar Pipeline y Pagos + filtrado por permisos
19. `supabase/migrations/003_opportunities.sql` — Todas las tablas nuevas + alter closers/app_users + RLS
20. Seed inicial de Role (admin, manager, closer, setter con permisos por defecto)
21. Seed inicial de PaymentType (Stripe, Transfer, Crypto, Cash, Deposito)
22. `.env.local.example` — Agregar `OUTBOUND_WEBHOOK_URL` y `OUTBOUND_WEBHOOK_SECRET`

### Scripts de migración

23. `scripts/backfill-contacts.ts` — Crear Contacts desde Leads/Calls/Opportunities existentes
24. `scripts/migrate-users-to-roles.ts` — Migrar app_users actuales al nuevo sistema de roles

---

## Fases de implementación

### Fase 1: Fundaciones de datos

1. Migration SQL (Role + Contact + Opportunity + Sale + Payment + PaymentType + alter closers/app_users)
2. Seed roles y PaymentTypes
3. Types TypeScript
4. Scripts backfill-contacts y migrate-users-to-roles

### Fase 2: Sistema de permisos

5. Middleware/helpers de verificación de permisos
6. Actualizar sidebar con filtrado por role
7. Páginas existentes con filtrado por role (Llamadas, Leads)

### Fase 3: Sync con GHL

8. Cliente GHL API (search, update opportunity, update custom fields)
9. Cron de sync (trae 407 oportunidades)
10. Matching automático Contact/Lead/Call

### Fase 4: Pipeline UI

11. Pipeline Kanban con filtros por rol
12. Detalle de oportunidad
13. Formulario post-agenda dinámico

### Fase 5: Ventas y Pagos

14. Creación automática de Sale al guardar form
15. Primer Payment automático
16. UI para agregar pagos adicionales (closer)
17. UI para editar/eliminar pagos (admin)
18. Vista de pagos pendientes global (admin/manager)

### Fase 6: Sync bidireccional + Webhook saliente

19. PUT a GHL al guardar form o agregar pago
20. Webhook saliente con payload completo (listo para conectar)
21. Documentación del contrato del webhook para futuro Make/Sheets

---

## Verificación

1. Migrations ejecutadas sin errores
2. Backfill crea Contacts y vincula Leads/Calls históricos
3. Cron trae las 407 oportunidades de GHL con contacts vinculados
4. Closer ve solo sus oportunidades; admin ve todas
5. Formulario post-agenda muestra/oculta campos según reglas
6. Al guardar form: DB (Opportunity + Sale + Payment) + GHL (custom fields + stage) + Webhook disparado
7. Pago Dividido: primera cuota se crea, monto_restante calculado correcto
8. Segunda cuota: closer la agrega, monto_restante se recalcula, webhook disparado
9. Admin puede editar/eliminar pagos
10. Closer no puede editar pagos
11. Manager ve pagos pero no crea ni edita
12. Setter no ve pagos ni puede llenar post-agenda
13. Recompra: misma Opportunity con 2 Sales independientes
14. Webhook saliente envía payload correcto (verificable con webhook.site)
15. Build sin errores + deploy a Vercel OK
