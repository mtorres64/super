// Índices para la base de datos supermarket
// Ejecutar con: mongosh supermarket create_indexes.js
//   o desde mongosh: load("create_indexes.js")

const DB_NAME = "supermarket";
use(DB_NAME);

let ok = 0, skip = 0, err = 0;

function idx(col, keys, options = {}) {
  try {
    db[col].createIndex(keys, options);
    print(`  ✓  ${col}  ${JSON.stringify(keys)}`);
    ok++;
  } catch (e) {
    if (e.codeName === "IndexOptionsConflict" || e.code === 85 || e.code === 86) {
      print(`  -  ${col}  ${JSON.stringify(keys)}  (ya existe)`);
      skip++;
    } else {
      print(`  ✗  ${col}  ${JSON.stringify(keys)}  ERROR: ${e.message}`);
      err++;
    }
  }
}

// ── Productos ────────────────────────────────────────────────────────────────
idx("products", { empresa_id: 1, activo: 1 });
idx("products", { empresa_id: 1, codigo_barras: 1 });
idx("products", { empresa_id: 1, kind: 1 });
idx("products", { empresa_id: 1, control_stock: 1 });
idx("products", { id: 1 }, { unique: true });

// ── Productos por sucursal ───────────────────────────────────────────────────
idx("branch_products", { product_id: 1, branch_id: 1, empresa_id: 1 }, { unique: true });
idx("branch_products", { branch_id: 1, empresa_id: 1, activo: 1 });
idx("branch_products", { empresa_id: 1 });

// ── Ventas ───────────────────────────────────────────────────────────────────
idx("sales", { empresa_id: 1, fecha: -1 });
idx("sales", { empresa_id: 1, branch_id: 1, fecha: -1 });
idx("sales", { empresa_id: 1, cajero_id: 1, fecha: -1 });
idx("sales", { empresa_id: 1, session_id: 1 });
idx("sales", { empresa_id: 1, afip_estado: 1 });
idx("sales", { id: 1 }, { unique: true });

// ── Devoluciones ─────────────────────────────────────────────────────────────
idx("sale_returns", { sale_id: 1, empresa_id: 1 });
idx("sale_returns", { empresa_id: 1 });

// ── Usuarios ─────────────────────────────────────────────────────────────────
idx("users", { email: 1 }, { unique: true });
idx("users", { empresa_id: 1 });
idx("users", { empresa_id: 1, rol: 1 });
idx("users", { id: 1 }, { unique: true });

// ── Sesiones de caja ─────────────────────────────────────────────────────────
idx("cash_sessions", { empresa_id: 1, user_id: 1, status: 1 });
idx("cash_sessions", { empresa_id: 1, fecha_apertura: -1 });
idx("cash_sessions", { id: 1 }, { unique: true });

// ── Movimientos de caja ───────────────────────────────────────────────────────
idx("cash_movements", { session_id: 1, empresa_id: 1, fecha: 1 });

// ── Notificaciones ────────────────────────────────────────────────────────────
idx("notificaciones", { empresa_id: 1, leida: 1 });
idx("notificaciones", { empresa_id: 1, tipo: 1, periodo_ref: 1 });

// ── Suscripciones ─────────────────────────────────────────────────────────────
idx("suscripciones", { empresa_id: 1 });
idx("suscripciones", { status: 1 });
idx("suscripciones", { mp_preapproval_id: 1 });

// ── Pagos de suscripción ──────────────────────────────────────────────────────
idx("pagos_suscripcion", { empresa_id: 1 });
idx("pagos_suscripcion", { mp_payment_id: 1 });
idx("pagos_suscripcion", { mp_preference_id: 1 });
idx("pagos_suscripcion", { mp_preapproval_id: 1 });
idx("pagos_suscripcion", { estado: 1 });

// ── Sucursales ────────────────────────────────────────────────────────────────
idx("branches", { empresa_id: 1, activo: 1 });
idx("branches", { id: 1 }, { unique: true });

// ── Categorías ────────────────────────────────────────────────────────────────
idx("categories", { empresa_id: 1 });
idx("categories", { id: 1 }, { unique: true });

// ── Compras / Proveedores ─────────────────────────────────────────────────────
idx("compras", { empresa_id: 1, fecha: -1 });
idx("compras", { id: 1 }, { unique: true });
idx("proveedores", { empresa_id: 1 });
idx("proveedores", { id: 1 }, { unique: true });

// ── Configuración ─────────────────────────────────────────────────────────────
idx("configuration", { empresa_id: 1 }, { unique: true });
idx("system_config",  { key: 1 },       { unique: true });
idx("afip_config",    { empresa_id: 1, activo: 1 });

// ── Empresas ──────────────────────────────────────────────────────────────────
idx("empresas", { id: 1 }, { unique: true });
idx("empresas", { activo: 1, email_verificado: 1 });

// ── OTPs / resets (TTL: MongoDB borra los documentos expirados automáticamente)
idx("email_otps",     { email: 1 });
idx("email_otps",     { expires_at: 1 }, { expireAfterSeconds: 0 });
idx("password_resets", { email: 1 });
idx("password_resets", { expires_at: 1 }, { expireAfterSeconds: 0 });

// ── Resumen ───────────────────────────────────────────────────────────────────
print(`\nListo: ${ok} creados, ${skip} ya existían, ${err} errores.`);
