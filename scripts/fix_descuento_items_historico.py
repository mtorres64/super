#!/usr/bin/env python3
"""
Corrige el total de ventas históricas afectadas por el bug de descuentos por producto.

Contexto
--------
Antes del fix en backend/server.py, `create_sale` / `update_sale` guardaban cada
línea con el precio de catálogo SIN aplicar el % de descuento por ítem. Resultado:
`Sale.subtotal` y `Sale.total` quedaban inflados exactamente en la suma de los
descuentos por producto (`descuento_items`).

Este script recalcula, para cada venta anterior al fix:
  - items[].precio_unitario  -> precio neto (con el % de descuento aplicado)
  - items[].subtotal         -> cantidad * precio neto
  - subtotal                 -> suma de subtotales netos
  - descuento_items          -> bruto - neto
  - impuestos                -> neto * tax_rate
  - total                    -> base_total + ajuste_pago - descuento_gral + impuestos_extra

Uso
---
  python scripts/fix_descuento_items_historico.py                  # DRY-RUN (no escribe nada)
  python scripts/fix_descuento_items_historico.py --apply          # corrige las ventas
  python scripts/fix_descuento_items_historico.py --apply --con-caja  # + ajusta cash_sessions / cash_movements
  python scripts/fix_descuento_items_historico.py --cutoff "2026-09-02T20:00:00"  # solo ventas anteriores a esa fecha
  python scripts/fix_descuento_items_historico.py --empresa <empresa_id>          # filtra una empresa

Notas de seguridad
------------------
  - Por defecto es DRY-RUN: solo imprime el reporte, no toca la base.
  - Idempotente: una venta ya corregida se detecta (su total ya coincide con el
    valor corregido) y se saltea.
  - Se marcan como REVISAR (y NO se tocan) las ventas con:
        * devoluciones (sale_returns) o notas de crédito (credit_notes)
        * afip_estado == "autorizado"
        * impuestos_extra_total > 0  (no se puede recomponer sin la config del impuesto)
        * datos que no encajan ni con el modelo "con bug" ni con el "corregido"
  - --cutoff debería ser el momento del deploy del fix. Ventas posteriores ya
    nacen correctas y se saltean. Default: ahora.
"""
import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
import os  # noqa: E402

load_dotenv(backend_path / ".env")

TOL = 1.0  # tolerancia en $ para clasificar por comparación de totales


def r2(x: float) -> float:
    return round(x + 0.0, 2)


def parse_dt(s: str) -> datetime:
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def recompute_total(base_amount: float, tax_rate: float, adj_pct: float,
                    descuento_gral: float, impuestos_extra: float) -> float:
    """Misma fórmula que create_sale en el backend."""
    base_total = base_amount * (1 + tax_rate)
    adjustment = base_total * (adj_pct / 100.0)
    return r2(base_total + adjustment - descuento_gral + impuestos_extra)


async def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # consola Windows
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="Corrige totales de ventas afectadas por el bug de descuento_items")
    ap.add_argument("--apply", action="store_true", help="Escribe los cambios (sin esto es dry-run)")
    ap.add_argument("--con-caja", action="store_true", help="Ajusta también cash_sessions.monto_ventas y cash_movements")
    ap.add_argument("--cutoff", type=str, default=None, help="ISO datetime; solo ventas con fecha < cutoff (default: ahora)")
    ap.add_argument("--empresa", type=str, default=None, help="Filtra por empresa_id")
    ap.add_argument("--limit", type=int, default=0, help="Procesa como máximo N ventas (0 = todas)")
    args = ap.parse_args()

    cutoff = parse_dt(args.cutoff) if args.cutoff else datetime.now(timezone.utc)

    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    db = client[os.environ["DB_NAME"]]

    q: dict = {"fecha": {"$lt": cutoff}}
    if args.empresa:
        q["empresa_id"] = args.empresa

    sales = await db.sales.find(q).sort("fecha", 1).to_list(None)
    if args.limit:
        sales = sales[: args.limit]

    # Config (tax_rate + ajustes por método de pago) cacheada por empresa
    cfg_cache: dict = {}

    async def get_cfg(empresa_id: str) -> dict:
        if empresa_id not in cfg_cache:
            c = await db.configuration.find_one({"empresa_id": empresa_id}) or {}
            cfg_cache[empresa_id] = {
                "tax_rate": float(c.get("tax_rate", 0.0) or 0.0),
                "adj": {k: float(v or 0.0) for k, v in (c.get("payment_method_adjustments") or {}).items()},
            }
        return cfg_cache[empresa_id]

    # Ventas con devoluciones / notas de crédito -> REVISAR
    sale_ids = [s["id"] for s in sales]
    con_devolucion: set = set()
    if sale_ids:
        for coll in ("sale_returns", "credit_notes"):
            async for d in db[coll].find({"sale_id": {"$in": sale_ids}}, {"sale_id": 1}):
                con_devolucion.add(d["sale_id"])

    stats = {"OK": 0, "CORREGIBLE": 0, "REVISAR": 0}
    revisar: list = []
    corregibles: list = []
    delta_total = 0.0

    for s in sales:
        items = s.get("items", []) or []
        has_disc = any(float(it.get("descuento") or 0) > 0 for it in items)
        if not has_disc:
            stats["OK"] += 1
            continue

        cfg = await get_cfg(s["empresa_id"])
        tax = cfg["tax_rate"]
        is_split = bool(s.get("pagos")) and len(s["pagos"]) > 1
        mp = s.get("metodo_pago")
        mp = mp.value if hasattr(mp, "value") else str(mp)
        adj_pct = 0.0 if is_split else cfg["adj"].get(mp, 0.0)

        descuento_gral = float(s.get("descuento") or 0.0)
        impuestos_extra = float(s.get("impuestos_extra_total") or 0.0)

        gross = sum(float(it["cantidad"]) * float(it["precio_unitario"]) for it in items)
        net = sum(
            float(it["cantidad"]) * float(it["precio_unitario"]) * (1 - float(it.get("descuento") or 0) / 100.0)
            for it in items
        )
        if abs(gross - net) < 0.01:
            stats["OK"] += 1
            continue

        stored_total = float(s["total"])
        buggy_total = recompute_total(gross, tax, adj_pct, descuento_gral, impuestos_extra)
        fixed_total = recompute_total(net, tax, adj_pct, descuento_gral, impuestos_extra)

        reason = None
        if s["id"] in con_devolucion:
            reason = "tiene devolución / nota de crédito"
        elif s.get("afip_estado") == "autorizado":
            reason = "factura AFIP autorizada (CAE)"
        elif impuestos_extra > 0:
            reason = "impuestos_extra_total > 0 (no recomponible)"
        elif abs(stored_total - fixed_total) <= TOL and abs(stored_total - buggy_total) > TOL:
            stats["OK"] += 1  # ya corregida
            continue
        elif abs(stored_total - buggy_total) > TOL:
            reason = (f"total ${stored_total:.2f} no coincide con modelo con-bug "
                      f"${buggy_total:.2f} ni corregido ${fixed_total:.2f}")

        if reason:
            stats["REVISAR"] += 1
            revisar.append((s, reason))
            continue

        # --- Construir venta corregida ---
        new_items = []
        for it in items:
            d = float(it.get("descuento") or 0)
            cant = float(it["cantidad"])
            pu = float(it["precio_unitario"])
            new_pu = round(pu * (1 - d / 100.0), 4) if d > 0 else pu
            it2 = dict(it)
            it2["precio_unitario"] = new_pu
            it2["precio_unitario_bruto"] = pu if d > 0 else None  # precio de catálogo, para el ticket
            it2["subtotal"] = r2(cant * new_pu)
            new_items.append(it2)

        new_net = r2(sum(it["subtotal"] for it in new_items))
        new_desc_items = r2(gross - new_net)
        new_impuestos = r2(new_net * tax)
        new_total = recompute_total(new_net, tax, adj_pct, descuento_gral, impuestos_extra)
        delta = r2(new_total - stored_total)
        delta_total += delta

        stats["CORREGIBLE"] += 1
        corregibles.append({
            "sale": s,
            "set": {
                "items": new_items,
                "subtotal": new_net,
                "impuestos": new_impuestos,
                "descuento_items": new_desc_items,
                "total": new_total,
            },
            "delta": delta,
        })

    # ---------------- Reporte ----------------
    print("=" * 78)
    print(f"  {'DRY-RUN (no se escribe nada)' if not args.apply else 'APLICANDO CAMBIOS'}")
    print(f"  cutoff  : ventas con fecha < {cutoff.isoformat()}")
    print(f"  empresa : {args.empresa or 'todas'}")
    print(f"  ventas analizadas: {len(sales)}")
    print("=" * 78)

    if corregibles:
        print(f"\n  CORREGIBLES ({len(corregibles)}):")
        print(f"    {'Factura':<16} {'Fecha':<20} {'Total actual':>14} {'Total nuevo':>14} {'Dif':>12}")
        for c in corregibles:
            s = c["sale"]
            fecha = s["fecha"].isoformat()[:19] if isinstance(s["fecha"], datetime) else str(s["fecha"])[:19]
            print(f"    {s.get('numero_factura', s['id'][:8]):<16} {fecha:<20} "
                  f"{float(s['total']):>14,.2f} {c['set']['total']:>14,.2f} {c['delta']:>12,.2f}")
        print(f"\n    Dif total agregada: {delta_total:,.2f}")

    if revisar:
        print(f"\n  REVISAR MANUALMENTE ({len(revisar)}) - NO se tocan:")
        for s, reason in revisar:
            fecha = s["fecha"].isoformat()[:19] if isinstance(s["fecha"], datetime) else str(s["fecha"])[:19]
            print(f"    {s.get('numero_factura', s['id'][:8]):<16} {fecha:<20}  {reason}")

    print(f"\n  Resumen: OK/ya-correctas={stats['OK']}  "
          f"corregibles={stats['CORREGIBLE']}  revisar={stats['REVISAR']}")

    # ---------------- Aplicar ----------------
    if args.apply and corregibles:
        print("\n  Aplicando...")
        n_ventas = n_sesiones = n_mov = 0
        for c in corregibles:
            s = c["sale"]
            await db.sales.update_one({"id": s["id"]}, {"$set": c["set"]})
            n_ventas += 1

            if args.con_caja and abs(c["delta"]) >= 0.01:
                if s.get("session_id"):
                    await db.cash_sessions.update_one(
                        {"id": s["session_id"]}, {"$inc": {"monto_ventas": c["delta"]}}
                    )
                    n_sesiones += 1
                movs = await db.cash_movements.find(
                    {"venta_id": s["id"], "tipo": "venta"}
                ).to_list(10)
                if len(movs) == 1:
                    await db.cash_movements.update_one(
                        {"id": movs[0]["id"]}, {"$inc": {"monto": c["delta"]}}
                    )
                    n_mov += 1
                else:
                    print(f"    [!] {s.get('numero_factura')}: {len(movs)} movimientos de caja, "
                          f"ajustar manualmente (dif {c['delta']:,.2f})")

        print(f"  Listo. Ventas actualizadas: {n_ventas}"
              + (f" | sesiones de caja: {n_sesiones} | movimientos: {n_mov}" if args.con_caja else ""))
    elif not args.apply:
        print("\n  (dry-run: volvé a correr con --apply para escribir los cambios)")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
