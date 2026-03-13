#!/usr/bin/env python3
"""
Script para inicializar la base de datos con datos de demo para una ferretería.
Uso:
  python init_db_ferreteria.py          # Inicializa solo si las colecciones están vacías
  python init_db_ferreteria.py --reset  # Elimina todos los datos y reinicializa
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt as _bcrypt
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone, timedelta

# Load environment variables
load_dotenv(backend_path / '.env')

EMPRESA_NOMBRE = "Ferretería Demo"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_empresa(nombre):
    return {
        "id": str(uuid.uuid4()),
        "nombre": nombre,
        "activo": True,
        "created_at": datetime.now(timezone.utc),
    }


def make_user(nombre, email, password, rol, empresa_id, branch_id=None):
    return {
        "id": str(uuid.uuid4()),
        "empresa_id": empresa_id,
        "nombre": nombre,
        "email": email,
        "password": _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode(),
        "rol": rol,
        "branch_id": branch_id,
        "activo": True,
        "created_at": datetime.now(timezone.utc),
    }


def make_category(nombre, descripcion, empresa_id):
    return {
        "id": str(uuid.uuid4()),
        "empresa_id": empresa_id,
        "nombre": nombre,
        "descripcion": descripcion,
        "created_at": datetime.now(timezone.utc),
    }


def make_product(nombre, barcode, tipo, precio, categoria_id, empresa_id,
                 stock=50, stock_minimo=5, precio_por_peso=None):
    return {
        "id": str(uuid.uuid4()),
        "empresa_id": empresa_id,
        "nombre": nombre,
        "codigo_barras": barcode,
        "tipo": tipo,
        "precio": precio,
        "precio_por_peso": precio_por_peso if tipo == "por_peso" else None,
        "categoria_id": categoria_id,
        "stock": stock,
        "stock_minimo": stock_minimo,
        "activo": True,
        "created_at": datetime.now(timezone.utc),
    }


def make_proveedor(nombre, ruc_cuit, email, telefono, direccion, empresa_id):
    return {
        "id": str(uuid.uuid4()),
        "empresa_id": empresa_id,
        "nombre": nombre,
        "ruc_cuit": ruc_cuit,
        "email": email,
        "telefono": telefono,
        "direccion": direccion,
        "activo": True,
        "created_at": datetime.now(timezone.utc),
    }

# ---------------------------------------------------------------------------
# Indexes & reset
# ---------------------------------------------------------------------------

async def create_indexes(db):
    print("Creating indexes...")

    await db.empresas.create_index("nombre")
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("empresa_id", 1), ("rol", 1)])
    await db.users.create_index([("empresa_id", 1), ("branch_id", 1)])
    await db.products.create_index(
        [("empresa_id", 1), ("codigo_barras", 1)], unique=True, sparse=True
    )
    await db.products.create_index([("empresa_id", 1), ("categoria_id", 1)])
    await db.products.create_index([("empresa_id", 1), ("activo", 1)])
    await db.categories.create_index([("empresa_id", 1), ("nombre", 1)], unique=True)
    await db.branches.create_index([("empresa_id", 1), ("activo", 1)])
    await db.branch_products.create_index(
        [("empresa_id", 1), ("product_id", 1), ("branch_id", 1)], unique=True
    )
    await db.branch_products.create_index([("empresa_id", 1), ("branch_id", 1)])
    await db.sales.create_index([("empresa_id", 1), ("branch_id", 1), ("fecha", -1)])
    await db.sales.create_index([("empresa_id", 1), ("cajero_id", 1)])
    await db.sales.create_index([("empresa_id", 1), ("session_id", 1)])
    await db.sale_returns.create_index([("empresa_id", 1), ("sale_id", 1)])
    await db.sale_returns.create_index([("empresa_id", 1), ("fecha", -1)])
    await db.cash_sessions.create_index([("empresa_id", 1), ("user_id", 1), ("status", 1)])
    await db.cash_sessions.create_index([("empresa_id", 1), ("branch_id", 1), ("status", 1)])
    await db.cash_movements.create_index([("empresa_id", 1), ("session_id", 1)])
    await db.configuration.create_index("empresa_id", unique=True)
    await db.suscripciones.create_index("empresa_id", unique=True)
    await db.pagos_suscripcion.create_index([("empresa_id", 1), ("fecha", -1)])
    await db.pagos_suscripcion.create_index("mp_payment_id", sparse=True)
    await db.proveedores.create_index([("empresa_id", 1), ("activo", 1)])
    await db.proveedores.create_index([("empresa_id", 1), ("nombre", 1)])
    await db.compras.create_index([("empresa_id", 1), ("fecha", -1)])
    await db.compras.create_index([("empresa_id", 1), ("proveedor_id", 1)])
    await db.afip_config.create_index("empresa_id", unique=True)
    await db.system_config.create_index("key", unique=True)

    print("✅ Indexes created successfully")


async def reset_database(db):
    collections = [
        "empresas", "users", "categories", "products", "branches",
        "branch_products", "sales", "sale_returns", "cash_sessions",
        "cash_movements", "configuration", "suscripciones", "pagos_suscripcion",
        "proveedores", "compras", "afip_config", "system_config",
    ]
    for col in collections:
        await db[col].delete_many({})
    print("🗑️  Database reset completed")

# ---------------------------------------------------------------------------
# Seeds
# ---------------------------------------------------------------------------

async def seed_empresa(db):
    print(f"Creating demo empresa: {EMPRESA_NOMBRE}...")
    existing = await db.empresas.find_one({"nombre": EMPRESA_NOMBRE})
    if existing:
        print("ℹ️  Demo empresa already exists")
        return existing["id"]

    empresa = make_empresa(EMPRESA_NOMBRE)
    await db.empresas.insert_one(empresa)
    print(f"✅ Demo empresa created (id: {empresa['id']})")
    return empresa["id"]


async def seed_users(db, empresa_id):
    print("Creating users...")
    if await db.users.find_one({"email": "admin@ferreteria.com"}):
        print("ℹ️  Users already exist")
        return

    users = [
        make_user("Admin Ferretería",  "admin@ferreteria.com",      "admin123",  "admin",      empresa_id),
        make_user("Roberto Vendedor",  "vendedor@ferreteria.com",   "cajero123", "cajero",     empresa_id),
        make_user("Pedro Encargado",   "vendedor2@ferreteria.com",  "cajero123", "cajero",     empresa_id),
        make_user("Marcela Supervisora","supervisor@ferreteria.com","super123",  "supervisor", empresa_id),
    ]
    await db.users.insert_many(users)
    print("✅ Users created successfully")


async def seed_categories(db, empresa_id):
    print("Creating categories...")
    if await db.categories.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Categories already exist")
        return

    categories = [
        make_category("Herramientas Manuales",    "Martillos, destornilladores, llaves y alicates",     empresa_id),
        make_category("Herramientas Eléctricas",  "Taladros, amoladoras, sierras y rotopercutores",     empresa_id),
        make_category("Electricidad",             "Cables, tomacorrientes, llaves de luz y tableros",   empresa_id),
        make_category("Plomería",                 "Caños, fitting, llaves de paso y accesorios",         empresa_id),
        make_category("Pintura y Acabados",       "Pinturas, esmaltes, rodillos y brochas",             empresa_id),
        make_category("Tornillería y Fijaciones", "Tornillos, clavos, bulones, tarugos y adhesivos",    empresa_id),
        make_category("Materiales de Construcción","Cemento, cal, arena, ladrillos y yeso",             empresa_id),
        make_category("Jardinería",               "Mangueras, palas, rastrillos y accesorios de riego", empresa_id),
        make_category("Seguridad y EPP",          "Cascos, guantes, gafas y calzado de seguridad",      empresa_id),
        make_category("Cerrajería",               "Candados, cerraduras, bisagras y herrajes",           empresa_id),
    ]
    await db.categories.insert_many(categories)
    print("✅ Categories created successfully")


async def seed_products(db, empresa_id):
    print("Creating products...")
    if await db.products.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Products already exist")
        return

    cat_docs = await db.categories.find({"empresa_id": empresa_id}).to_list(None)
    if not cat_docs:
        print("⚠️  No categories found, skipping products")
        return
    c = {cat["nombre"]: cat["id"] for cat in cat_docs}

    products = [
        # ── Herramientas Manuales ─────────────────────────────────────────
        make_product("Martillo Carpintero 500g Stanley",       "7790300001001", "codigo_barras",  8500.0, c["Herramientas Manuales"], empresa_id, stock=20, stock_minimo=4),
        make_product("Juego Destornilladores 6 Piezas Bahco",  "7790300001002", "codigo_barras", 15000.0, c["Herramientas Manuales"], empresa_id, stock=15, stock_minimo=3),
        make_product("Llave Inglesa 12\" Stanley",             "7790300001003", "codigo_barras", 11500.0, c["Herramientas Manuales"], empresa_id, stock=12, stock_minimo=3),
        make_product("Alicate Universal 8\" Pretul",           "7790300001004", "codigo_barras",  6800.0, c["Herramientas Manuales"], empresa_id, stock=18, stock_minimo=4),
        make_product("Serrucho 20\" Truper",                   "7790300001005", "codigo_barras",  9200.0, c["Herramientas Manuales"], empresa_id, stock=10, stock_minimo=2),
        make_product("Nivel de Burbuja 60cm Sata",             "7790300001006", "codigo_barras",  7500.0, c["Herramientas Manuales"], empresa_id, stock=14, stock_minimo=3),
        make_product("Cinta Métrica 5m Stanley",               "7790300001007", "codigo_barras",  4200.0, c["Herramientas Manuales"], empresa_id, stock=25, stock_minimo=5),
        make_product("Juego Llaves Fijas 8 Piezas Gedore",     "7790300001008", "codigo_barras", 22000.0, c["Herramientas Manuales"], empresa_id, stock=8,  stock_minimo=2),

        # ── Herramientas Eléctricas ───────────────────────────────────────
        make_product("Taladro Percutor 1/2\" 800W Bosch",      "7790300002001", "codigo_barras", 55000.0, c["Herramientas Eléctricas"], empresa_id, stock=8,  stock_minimo=2),
        make_product("Amoladora Angular 115mm 700W DeWalt",    "7790300002002", "codigo_barras", 48000.0, c["Herramientas Eléctricas"], empresa_id, stock=7,  stock_minimo=2),
        make_product("Sierra Circular 7-1/4\" 1400W Makita",   "7790300002003", "codigo_barras", 72000.0, c["Herramientas Eléctricas"], empresa_id, stock=5,  stock_minimo=1),
        make_product("Rotomartillo SDS+ 800W Bosch",           "7790300002004", "codigo_barras", 85000.0, c["Herramientas Eléctricas"], empresa_id, stock=4,  stock_minimo=1),
        make_product("Atornillador a Batería 12V Black&Decker", "7790300002005", "codigo_barras", 38000.0, c["Herramientas Eléctricas"], empresa_id, stock=10, stock_minimo=2),

        # ── Electricidad ──────────────────────────────────────────────────
        make_product("Cable Unipolar 2.5mm² Phelps Rojo x10m", "7790300003001", "codigo_barras",  6500.0, c["Electricidad"], empresa_id, stock=30, stock_minimo=5),
        make_product("Cable Unipolar 2.5mm² Phelps Azul x10m", "7790300003002", "codigo_barras",  6500.0, c["Electricidad"], empresa_id, stock=30, stock_minimo=5),
        make_product("Tomacorriente Doble Plegable Bticino",    "7790300003003", "codigo_barras",  3800.0, c["Electricidad"], empresa_id, stock=40, stock_minimo=8),
        make_product("Llave de Luz Simple Schneider",           "7790300003004", "codigo_barras",  4200.0, c["Electricidad"], empresa_id, stock=35, stock_minimo=7),
        make_product("Tablero Térmica 4 Módulos Bticino",       "7790300003005", "codigo_barras", 18000.0, c["Electricidad"], empresa_id, stock=10, stock_minimo=2),
        make_product("Cinta Aislante 20m 3M",                  "7790300003006", "codigo_barras",  1800.0, c["Electricidad"], empresa_id, stock=50, stock_minimo=10),
        make_product("Portalámpara E27 Porcelana",             "7790300003007", "codigo_barras",  2200.0, c["Electricidad"], empresa_id, stock=40, stock_minimo=8),
        make_product("Interruptor Termomagnético 20A Bticino",  "7790300003008", "codigo_barras",  9500.0, c["Electricidad"], empresa_id, stock=15, stock_minimo=3),

        # ── Plomería ──────────────────────────────────────────────────────
        make_product("Caño PVC 110mm x 3m Tigre",              "7790300004001", "codigo_barras", 12500.0, c["Plomería"], empresa_id, stock=15, stock_minimo=3),
        make_product("Caño PPR 20mm x 3m",                     "7790300004002", "codigo_barras",  6800.0, c["Plomería"], empresa_id, stock=20, stock_minimo=4),
        make_product("Llave de Paso Esférica 1/2\" FV",        "7790300004003", "codigo_barras",  5500.0, c["Plomería"], empresa_id, stock=25, stock_minimo=5),
        make_product("Codo PVC 90° 110mm Tigre",               "7790300004004", "codigo_barras",  2800.0, c["Plomería"], empresa_id, stock=30, stock_minimo=6),
        make_product("Teflón 12m Standard",                    "7790300004005", "codigo_barras",   800.0, c["Plomería"], empresa_id, stock=60, stock_minimo=12),
        make_product("Flexibles de Ducha 1.50m Inox",          "7790300004006", "codigo_barras",  4200.0, c["Plomería"], empresa_id, stock=20, stock_minimo=4),
        make_product("Flotante para Tanque Universal",          "7790300004007", "codigo_barras",  3500.0, c["Plomería"], empresa_id, stock=18, stock_minimo=4),

        # ── Pintura y Acabados ────────────────────────────────────────────
        make_product("Pintura Látex Interior Blanca 4L Alba",  "7790300005001", "codigo_barras", 18500.0, c["Pintura y Acabados"], empresa_id, stock=20, stock_minimo=4),
        make_product("Pintura Látex Exterior 4L Sinteplast",   "7790300005002", "codigo_barras", 22000.0, c["Pintura y Acabados"], empresa_id, stock=15, stock_minimo=3),
        make_product("Esmalte Sintético Negro Brillante 1L",   "7790300005003", "codigo_barras",  9800.0, c["Pintura y Acabados"], empresa_id, stock=18, stock_minimo=4),
        make_product("Rodillo Lana 22cm con Mango",            "7790300005004", "codigo_barras",  3200.0, c["Pintura y Acabados"], empresa_id, stock=30, stock_minimo=6),
        make_product("Pincel Cerdo N°25",                      "7790300005005", "codigo_barras",  1500.0, c["Pintura y Acabados"], empresa_id, stock=40, stock_minimo=8),
        make_product("Fijador Impregnador al Agua 4L",         "7790300005006", "codigo_barras", 14000.0, c["Pintura y Acabados"], empresa_id, stock=12, stock_minimo=3),
        make_product("Masilla Plástica 1kg Tintex",            "7790300005007", "codigo_barras",  5500.0, c["Pintura y Acabados"], empresa_id, stock=20, stock_minimo=4),

        # ── Tornillería y Fijaciones ──────────────────────────────────────
        make_product("Tornillo Autoperforante 8x1\" x100u",    "7790300006001", "codigo_barras",  1800.0, c["Tornillería y Fijaciones"], empresa_id, stock=50, stock_minimo=10),
        make_product("Tornillo MDF 4x40mm x100u",              "7790300006002", "codigo_barras",  2200.0, c["Tornillería y Fijaciones"], empresa_id, stock=45, stock_minimo=10),
        make_product("Bulón Hexagonal 1/4\" x50u",             "7790300006003", "codigo_barras",  2500.0, c["Tornillería y Fijaciones"], empresa_id, stock=40, stock_minimo=8),
        make_product("Tarugo Fischer 8mm x50u",                "7790300006004", "codigo_barras",  1600.0, c["Tornillería y Fijaciones"], empresa_id, stock=55, stock_minimo=10),
        make_product("Clavo de Acero 1.5\" x500g",             "7790300006005", "codigo_barras",  3200.0, c["Tornillería y Fijaciones"], empresa_id, stock=30, stock_minimo=6),
        make_product("Adhesivo Epoxi Bicomponente Poxipol",    "7790300006006", "codigo_barras",  5800.0, c["Tornillería y Fijaciones"], empresa_id, stock=25, stock_minimo=5),
        make_product("Silicona Neutra Blanca 280ml",           "7790300006007", "codigo_barras",  4500.0, c["Tornillería y Fijaciones"], empresa_id, stock=28, stock_minimo=6),

        # ── Materiales de Construcción ────────────────────────────────────
        make_product("Cemento Portland Normal 50kg Loma Negra","7790300007001", "codigo_barras", 12000.0, c["Materiales de Construcción"], empresa_id, stock=30, stock_minimo=6),
        make_product("Cal Hidráulica 25kg",                    "7790300007002", "codigo_barras",  5500.0, c["Materiales de Construcción"], empresa_id, stock=25, stock_minimo=5),
        make_product("Yeso Proyectable 40kg Durlock",          "7790300007003", "codigo_barras",  8200.0, c["Materiales de Construcción"], empresa_id, stock=20, stock_minimo=4),
        make_product("Placa Durlock 12.5mm 1.20x2.40m",        "7790300007004", "codigo_barras", 14500.0, c["Materiales de Construcción"], empresa_id, stock=15, stock_minimo=3),
        make_product("Membrana Asfáltica 4mm x10m2 Bauken",    "7790300007005", "codigo_barras", 35000.0, c["Materiales de Construcción"], empresa_id, stock=8,  stock_minimo=2),
        make_product("Mosáico Calcáreo 20x20 Blanco x1m2",     "7790300007006", "codigo_barras",  6800.0, c["Materiales de Construcción"], empresa_id, stock=40, stock_minimo=8),

        # ── Jardinería ────────────────────────────────────────────────────
        make_product("Manguera Reforzada 1/2\" x30m Pegoraro", "7790300008001", "codigo_barras", 12000.0, c["Jardinería"], empresa_id, stock=12, stock_minimo=3),
        make_product("Aspersor Circular de Jardín",             "7790300008002", "codigo_barras",  6500.0, c["Jardinería"], empresa_id, stock=15, stock_minimo=3),
        make_product("Pala Punta Redonda con Cabo 1.20m",       "7790300008003", "codigo_barras",  9800.0, c["Jardinería"], empresa_id, stock=10, stock_minimo=2),
        make_product("Rastrillo 16 Dientes con Cabo",           "7790300008004", "codigo_barras",  8200.0, c["Jardinería"], empresa_id, stock=10, stock_minimo=2),
        make_product("Tijera Podadora de Jardín Bahco",         "7790300008005", "codigo_barras", 11500.0, c["Jardinería"], empresa_id, stock=8,  stock_minimo=2),
        make_product("Fertilizante Granulado 1kg Nutriplant",   "7790300008006", "codigo_barras",  4800.0, c["Jardinería"], empresa_id, stock=20, stock_minimo=4),

        # ── Seguridad y EPP ───────────────────────────────────────────────
        make_product("Casco de Seguridad Blanco MSA",           "7790300009001", "codigo_barras",  8500.0, c["Seguridad y EPP"], empresa_id, stock=15, stock_minimo=3),
        make_product("Guantes de Trabajo Cuero T-10",           "7790300009002", "codigo_barras",  3200.0, c["Seguridad y EPP"], empresa_id, stock=25, stock_minimo=5),
        make_product("Gafas Protectoras Transparentes 3M",      "7790300009003", "codigo_barras",  4500.0, c["Seguridad y EPP"], empresa_id, stock=20, stock_minimo=4),
        make_product("Tapones Auditivos 3M x5 pares",           "7790300009004", "codigo_barras",  2800.0, c["Seguridad y EPP"], empresa_id, stock=30, stock_minimo=6),
        make_product("Bota de Seguridad con Puntera T-42",      "7790300009005", "codigo_barras", 38000.0, c["Seguridad y EPP"], empresa_id, stock=8,  stock_minimo=2),

        # ── Cerrajería ────────────────────────────────────────────────────
        make_product("Candado de Hierro 50mm Yale",             "7790300010001", "codigo_barras",  9500.0, c["Cerrajería"], empresa_id, stock=15, stock_minimo=3),
        make_product("Cerradura Doble Paleta FV",               "7790300010002", "codigo_barras", 28000.0, c["Cerrajería"], empresa_id, stock=8,  stock_minimo=2),
        make_product("Bisagra Acero Inox 3\" x2u",              "7790300010003", "codigo_barras",  4200.0, c["Cerrajería"], empresa_id, stock=25, stock_minimo=5),
        make_product("Manija Puerta Interior Cromada",          "7790300010004", "codigo_barras",  7800.0, c["Cerrajería"], empresa_id, stock=12, stock_minimo=3),
        make_product("Cadena de Seguridad 10mm x1m",            "7790300010005", "codigo_barras",  5500.0, c["Cerrajería"], empresa_id, stock=20, stock_minimo=4),
    ]

    await db.products.insert_many(products)
    print(f"✅ {len(products)} products created successfully")


async def seed_branches(db, empresa_id):
    print("Creating branches...")
    if await db.branches.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Branches already exist")
        return

    branches = [
        {
            "id": str(uuid.uuid4()),
            "empresa_id": empresa_id,
            "nombre": "Local Principal",
            "direccion": "Av. Rivadavia 5200, Buenos Aires",
            "telefono": "+54 11 4612-3344",
            "activo": True,
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": str(uuid.uuid4()),
            "empresa_id": empresa_id,
            "nombre": "Depósito Sur",
            "direccion": "Calle Industrial 780, Lomas de Zamora",
            "telefono": "+54 11 4282-7788",
            "activo": True,
            "created_at": datetime.now(timezone.utc),
        },
    ]
    await db.branches.insert_many(branches)
    print("✅ Branches created successfully")

    main_branch_id = branches[0]["id"]
    await db.users.update_many(
        {"empresa_id": empresa_id},
        {"$set": {"branch_id": main_branch_id}}
    )

    products = await db.products.find({"empresa_id": empresa_id}).to_list(None)
    branch_products = [
        {
            "id": str(uuid.uuid4()),
            "empresa_id": empresa_id,
            "product_id": product["id"],
            "branch_id": branch["id"],
            "precio": product["precio"],
            "precio_por_peso": product.get("precio_por_peso"),
            "stock": product["stock"],
            "stock_minimo": product["stock_minimo"],
            "costo": None,
            "margen": None,
            "activo": True,
            "created_at": datetime.now(timezone.utc),
        }
        for branch in branches
        for product in products
    ]

    if branch_products:
        await db.branch_products.insert_many(branch_products)
        print(f"✅ {len(branch_products)} branch_products created successfully")


async def seed_configuration(db, empresa_id):
    print("Creating default configuration...")
    if await db.configuration.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Configuration already exists")
        return

    default_config = {
        "id": str(uuid.uuid4()),
        "empresa_id": empresa_id,
        "company_name": EMPRESA_NOMBRE,
        "company_address": "",
        "company_phone": "",
        "company_email": "",
        "company_tax_id": "",
        "tax_rate": 0.21,
        "currency_symbol": "$",
        "currency_code": "ARS",
        "sounds_enabled": True,
        "auto_focus_barcode": True,
        "barcode_scan_timeout": 100,
        "receipt_footer_text": "¡Gracias por su compra! Somos su ferretería de confianza.",
        "default_minimum_stock": 3,
        "low_stock_alert_enabled": True,
        "auto_update_inventory": True,
        "date_format": "DD/MM/YYYY",
        "time_format": "24h",
        "language": "es",
        "print_receipt_auto": False,
        "receipt_width": 80,
        "items_per_page": 10,
        "company_logo": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.configuration.insert_one(default_config)
    print("✅ Default configuration created successfully")


async def seed_suscripcion(db, empresa_id):
    print("Creating demo subscription...")
    if await db.suscripciones.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Subscription already exists")
        return

    now = datetime.now(timezone.utc)
    suscripcion = {
        "id": str(uuid.uuid4()),
        "empresa_id": empresa_id,
        "plan_nombre": "Plan Trial",
        "precio": 0.0,
        "moneda": "ARS",
        "status": "trial",
        "fecha_inicio": now,
        "fecha_vencimiento": now + timedelta(days=30),
        "dia_facturacion": None,
        "plan_tipo": "mensual",
        "created_at": now,
    }
    await db.suscripciones.insert_one(suscripcion)
    print("✅ Demo subscription created (TRIAL - 30 days)")


async def seed_proveedores(db, empresa_id):
    print("Creating demo proveedores...")
    if await db.proveedores.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Proveedores already exist")
        return

    proveedores = [
        make_proveedor("Herramientas del Plata S.A.",  "30-22334455-6", "ventas@herraplata.com",     "+54 11 4345-6677", "Av. Rivadavia 3000, Buenos Aires",  empresa_id),
        make_proveedor("Distribuidora Eléctrica Norte","20-66778800-4", "pedidos@electnorte.com",    "+54 11 4789-1122", "Calle San Martín 450, Quilmes",      empresa_id),
        make_proveedor("Pinturas & Revestimientos SA", "30-55443322-8", "ventas@pinturasyr.com",     "+54 11 4512-8899", "Av. Alem 780, Rosario",              empresa_id),
        make_proveedor("Materiales Olavarría S.R.L.",  "20-33221100-5", "info@materialesolav.com",   "+54 11 4256-3344", "Ruta 60 km 5, Olavarría",            empresa_id),
        make_proveedor("Plomería y Gas del Sur",       "30-44556611-2", "contacto@plygsur.com",      "+54 11 4678-9900", "Calle Comercio 1100, Mar del Plata", empresa_id),
    ]
    await db.proveedores.insert_many(proveedores)
    print(f"✅ {len(proveedores)} proveedores created successfully")


async def seed_system_config(db):
    print("Creating system configuration...")
    defaults = [
        {"key": "suscripcion_precio",      "value": 50000.0},
        {"key": "suscripcion_plan_nombre", "value": "Plan Mensual"},
        {"key": "suscripcion_plan_tipo",   "value": "mensual"},
        {"key": "suscripcion_moneda",      "value": "ARS"},
        {"key": "trial_dias",              "value": 30},
    ]
    for entry in defaults:
        if not await db.system_config.find_one({"key": entry["key"]}):
            await db.system_config.insert_one(entry)
    print("✅ System configuration created successfully")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def init_database(reset: bool = False):
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"Connecting to database: {db_name}")

    try:
        if reset:
            await reset_database(db)

        await create_indexes(db)
        await seed_system_config(db)
        empresa_id = await seed_empresa(db)
        await seed_users(db, empresa_id)
        await seed_categories(db, empresa_id)
        await seed_products(db, empresa_id)
        await seed_branches(db, empresa_id)
        await seed_configuration(db, empresa_id)
        await seed_suscripcion(db, empresa_id)
        await seed_proveedores(db, empresa_id)

        print("\n🎉 Database initialization completed!")
    finally:
        client.close()


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    if reset_flag:
        print("⚠️  Reset mode: all existing data will be deleted.")
    asyncio.run(init_database(reset=reset_flag))
