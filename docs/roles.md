# Sistema de Roles y Permisos

Documento de referencia para entender, modificar y crear roles en Supabase.

---

## Estructura general

- **Tabla `roles`** contiene 18 flags booleanos.
- **Tabla `app_users`** referencia un role vía `role_id` (FK) y opcionalmente un closer vía `closer_id`.
- Cada flag controla un menú del sidebar (7) o una acción dentro (11).
- Los flags son **aditivos** (OR). Tener `admin` (role.name === 'admin') te da bypass de todos los checks.

---

## Los 18 flags

### Menús (visibilidad del sidebar) — 7 flags

| Flag | Qué muestra/permite |
|---|---|
| `ver_dashboard` | Acceso a `/dashboard` (home con métricas y gráficos) |
| `ver_llamadas` | Item "Llamadas" en sidebar + acceso a `/dashboard/calls` |
| `ver_oportunidades` | Item "Oportunidades" en sidebar + acceso a `/dashboard/pipeline` |
| `ver_closers` | Item "Closers" en sidebar + acceso a `/dashboard/closers` |
| `ver_leads` | Item "Leads" en sidebar + acceso a `/dashboard/leads` |
| `ver_ventas` | Item "Ventas" en sidebar + acceso a `/dashboard/payments` (vista global pagos pendientes) |
| `ver_configuracion` | Item "Configuración" en sidebar + acceso a `/dashboard/settings` |

### Sub-flags Oportunidades — 3 flags

| Flag | Qué controla |
|---|---|
| `ver_todas_oportunidades` | Ver **todas** las opps. Si es `false` → filtra automáticamente a las del closer asociado. |
| `editar_oportunidades` | Puede llenar el form post-agenda en sus **propias** opps (en stages "Post Llamada" o "Seguimiento"). |
| `editar_todas_oportunidades` | Edita cualquier opp (incluido cambiar stage manualmente, cambiar dueño, bypass de reglas). |

### Sub-flags Llamadas — 2 flags

| Flag | Qué controla |
|---|---|
| `ver_todas_llamadas` | Ver **todas** las llamadas. Si es `false` → filtra a las del closer asociado. |
| `importar_llamadas` | Botón "Importar llamadas" dentro de la página Llamadas + permiso para usar `POST /api/import`. |

### Sub-flags Ventas — 3 flags

| Flag | Qué controla |
|---|---|
| `ver_todas_ventas` | Acceso a la **vista global** de pagos pendientes. |
| `crear_pago` | Botón "Agregar pago" dentro del detalle de una venta. |
| `editar_pago` | Editar o eliminar pagos existentes (vía PATCH/DELETE en API). |

### Sub-flags Otros (a redefinir cuando se aborden esos menús) — 3 flags

| Flag | Qué controla |
|---|---|
| `editar_leads` | Edita leads + bypass de reglas de stage al cambiar `pipeline_stage` de una opp. |
| `editar_closers` | CRUD de closers (todavía sin chequeo activo). |
| `editar_usuarios` | Cambiar rol/closer asociado de un usuario en Settings (todavía sin chequeo activo). |

---

## Matriz por rol (seed inicial)

| | admin | manager | closer | setter |
|---|:---:|:---:|:---:|:---:|
| **Menús** | | | | |
| `ver_dashboard` | ✓ | ✗ | ✗ | ✗ |
| `ver_llamadas` | ✓ | ✗ | ✓ | ✗ |
| `ver_oportunidades` | ✓ | ✓ | ✓ | ✓ |
| `ver_closers` | ✓ | ✗ | ✗ | ✗ |
| `ver_leads` | ✓ | ✗ | ✗ | ✗ |
| `ver_ventas` | ✓ | ✗ | ✗ | ✗ |
| `ver_configuracion` | ✓ | ✗ | ✗ | ✗ |
| **Sub-flags Oportunidades** | | | | |
| `ver_todas_oportunidades` | ✓ | ✓ | ✗ | ✗ |
| `editar_oportunidades` | ✓ | ✓ | ✓ | ✗ |
| `editar_todas_oportunidades` | ✓ | ✓ | ✗ | ✗ |
| **Sub-flags Llamadas** | | | | |
| `ver_todas_llamadas` | ✓ | ✗ | ✗ | ✗ |
| `importar_llamadas` | ✓ | ✗ | ✗ | ✗ |
| **Sub-flags Ventas** | | | | |
| `ver_todas_ventas` | ✓ | ✗ | ✗ | ✗ |
| `crear_pago` | ✓ | ✓ | ✓ | ✗ |
| `editar_pago` | ✓ | ✓ | ✗ | ✗ |
| **Sub-flags Otros** | | | | |
| `editar_leads` | ✓ | ✗ | ✗ | ✗ |
| `editar_closers` | ✓ | ✗ | ✗ | ✗ |
| `editar_usuarios` | ✓ | ✗ | ✗ | ✗ |

---

## Caso "usuario con múltiples sombreros" (ej: Iñaki = manager + closer)

Cuando un `app_user` tiene `role_id` = manager **y** `closer_id` asignado:

- Los flags del rol **se aplican** (ve todo, edita todo).
- El `closer_id` queda como referencia operativa: si alguien le **asigna** una opp, va a quedar asociada a él como closer responsable.
- **Los flags ganan**: si el rol tiene `ver_todas_oportunidades = true`, el filtro por `closer_id` se ignora y ve todas las opps.
- Si querés que un manager **vea solo lo suyo**, hay que crear un rol nuevo con `ver_todas_oportunidades = false` y mantener el `closer_id` asignado.

---

## Cómo modificar permisos desde Supabase

Abrí el **SQL Editor** de Supabase y ejecutá:

### Ver permisos actuales de un rol
```sql
SELECT name,
  ver_dashboard, ver_llamadas, ver_oportunidades, ver_closers,
  ver_leads, ver_ventas, ver_configuracion,
  ver_todas_oportunidades, editar_oportunidades, editar_todas_oportunidades,
  ver_todas_llamadas, importar_llamadas,
  ver_todas_ventas, crear_pago, editar_pago,
  editar_leads, editar_closers, editar_usuarios
FROM roles
ORDER BY name;
```

### Cambiar UN permiso a un rol
```sql
UPDATE roles
SET editar_pago = true
WHERE name = 'closer';
```

### Cambiar VARIOS permisos al rol manager (ejemplo: darle acceso al menú Ventas)
```sql
UPDATE roles
SET ver_ventas = true,
    ver_todas_ventas = true
WHERE name = 'manager';
```

### Crear un rol nuevo (ejemplo: "supervisor")
```sql
INSERT INTO roles (
  name, description,
  ver_dashboard, ver_llamadas, ver_oportunidades, ver_closers, ver_leads, ver_ventas, ver_configuracion,
  ver_todas_oportunidades, editar_oportunidades, editar_todas_oportunidades,
  ver_todas_llamadas, importar_llamadas,
  ver_todas_ventas, crear_pago, editar_pago,
  editar_leads, editar_closers, editar_usuarios
)
VALUES (
  'supervisor', 'Ve dashboard + pipeline + llamadas. No edita pagos.',
  true, true, true, false, false, false, false,
  true, false, false,
  true, false,
  false, false, false,
  false, false, false
);
```

### Asignar un rol a un usuario
```sql
UPDATE app_users
SET role_id = (SELECT id FROM roles WHERE name = 'supervisor')
WHERE email = 'usuario@ejemplo.com';
```

### Vincular un usuario a un Closer (para que el filtro `ver_todas_X` se aplique)
```sql
UPDATE app_users
SET closer_id = (SELECT id FROM closers WHERE name = 'Hernan Grando')
WHERE email = 'usuario@ejemplo.com';
```

### Eliminar un rol (cuidado: si hay usuarios asignados quedan huérfanos)
```sql
-- Primero ver quién lo usa
SELECT email, role_id FROM app_users WHERE role_id = (SELECT id FROM roles WHERE name = 'rol_viejo');

-- Mover esos usuarios a otro rol antes
UPDATE app_users SET role_id = (SELECT id FROM roles WHERE name = 'closer')
WHERE role_id = (SELECT id FROM roles WHERE name = 'rol_viejo');

-- Y después borrar
DELETE FROM roles WHERE name = 'rol_viejo';
```

---

## Cómo el código chequea permisos

### Helpers (`src/lib/permissions.ts`)

- `getCurrentUser()` — devuelve `{ user, appUser, role, closer }` o `null` si no autenticado.
- `hasPermission(ctx, 'ver_X')` — boolean, retorna `true` si el rol tiene ese flag o `false`.
- `requirePermission('ver_X', '/dashboard')` — server guard que redirige si falta el permiso.
- `requireAuth()` — solo verifica que esté autenticado, sin chequear permisos específicos.
- `isAdmin(ctx)` — atajo, `true` si el role.name === 'admin'.
- `isCloser(ctx)` — `true` si tiene `closer_id` asignado.
- `getCloserFilter(ctx, 'ver_todas_X')` — devuelve `null` si tiene el flag (sin filtro), o el `closer_id` para filtrar queries.

### Patrón típico en una server page

```ts
// Caso 1: requerir un permiso para entrar
const ctx = await requirePermission('ver_oportunidades', '/dashboard')

// Caso 2: filtrar contenido según permiso de "ver todo"
const viewAll = isAdmin(ctx) || hasPermission(ctx, 'ver_todas_oportunidades')
if (!viewAll) {
  query = query.eq('closer_id', ctx.appUser.closer_id)
}

// Caso 3: pasar capacidades al componente client
const canEditPayment = isAdmin(ctx) || hasPermission(ctx, 'editar_pago')
```

---

## Histórico — mapeo del sistema viejo al nuevo

| Flag viejo (inglés) | Reemplazado por |
|---|---|
| `can_view_all` | `ver_dashboard` (home) + `ver_closers` (closers menu) — split en dos |
| `can_view_leads` | `ver_leads` |
| `can_manage_leads` | `editar_leads` |
| `can_view_all_opportunities` | `ver_todas_oportunidades` |
| `can_fill_post_agenda` | `editar_oportunidades` |
| `can_create_payment` | `crear_pago` |
| `can_edit_payment` | `editar_pago` |
| `can_view_all_payments` | `ver_todas_ventas` (+ `ver_ventas` para menú) |
| `can_view_all_calls` | `ver_todas_llamadas` (+ `ver_llamadas` para menú) |
| `can_import` | `importar_llamadas` (relocado a sub-flag) |
| `can_manage_closers` | `editar_closers` |
| `can_manage_users` | `editar_usuarios` |

Migración SQL en [supabase/migrations/006_roles_v2.sql](../supabase/migrations/006_roles_v2.sql).
