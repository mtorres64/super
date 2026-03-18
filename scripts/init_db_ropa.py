#!/usr/bin/env python3
"""
Script para inicializar la base de datos con datos de demo para una tienda de ropa.
Uso:
  python init_db_ropa.py          # Inicializa solo si las colecciones están vacías
  python init_db_ropa.py --reset  # Elimina todos los datos y reinicializa
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

EMPRESA_NOMBRE = "Fashion Store Demo"

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
    if await db.users.find_one({"email": "admin@fashionstore.com"}):
        print("ℹ️  Users already exist")
        return

    users = [
        make_user("Admin Fashion",     "admin@fashionstore.com",      "admin123",  "admin",      empresa_id),
        make_user("Luis Vendedor",     "vendedor@fashionstore.com",   "cajero123", "cajero",     empresa_id),
        make_user("María Vendedora",   "vendedor2@fashionstore.com",  "cajero123", "cajero",     empresa_id),
        make_user("Claudia Supervisora","supervisor@fashionstore.com","super123",  "supervisor", empresa_id),
    ]
    await db.users.insert_many(users)
    print("✅ Users created successfully")


async def seed_categories(db, empresa_id):
    print("Creating categories...")
    if await db.categories.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Categories already exist")
        return

    categories = [
        make_category("Remeras y Camisas",  "Remeras, camisas y tops para hombre y mujer", empresa_id),
        make_category("Pantalones y Jeans",  "Jeans, chinos, joggers y pantalones varios",  empresa_id),
        make_category("Vestidos y Faldas",   "Vestidos casuales, formales y faldas",        empresa_id),
        make_category("Ropa de Abrigo",      "Camperas, sweaters, hoodie y buzos",          empresa_id),
        make_category("Calzado",             "Zapatillas, zapatos, sandalias y botas",       empresa_id),
        make_category("Accesorios",          "Cinturones, gorros, bufandas y bolsos",        empresa_id),
        make_category("Ropa Interior",       "Ropa interior y medias para hombre y mujer",  empresa_id),
        make_category("Ropa de Niños",       "Ropa para bebés, niñas y niños",              empresa_id),
        make_category("Ropa Deportiva",      "Indumentaria para actividad física",          empresa_id),
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
        # ── Remeras y Camisas ─────────────────────────────────────────────
        make_product("Remera Básica Hombre Blanca T-M",   "7790200001001", "codigo_barras",  4500.0, c["Remeras y Camisas"], empresa_id, stock=30, stock_minimo=5),
        make_product("Remera Básica Hombre Blanca T-L",   "7790200001002", "codigo_barras",  4500.0, c["Remeras y Camisas"], empresa_id, stock=28, stock_minimo=5),
        make_product("Remera Básica Hombre Negra T-M",    "7790200001003", "codigo_barras",  4500.0, c["Remeras y Camisas"], empresa_id, stock=32, stock_minimo=5),
        make_product("Remera Básica Mujer Rosa T-S",      "7790200001004", "codigo_barras",  4200.0, c["Remeras y Camisas"], empresa_id, stock=25, stock_minimo=5),
        make_product("Camisa Oxford Hombre Celeste T-M",  "7790200001005", "codigo_barras", 12000.0, c["Remeras y Camisas"], empresa_id, stock=20, stock_minimo=4),
        make_product("Camisa Oxford Hombre Celeste T-L",  "7790200001006", "codigo_barras", 12000.0, c["Remeras y Camisas"], empresa_id, stock=18, stock_minimo=4),
        make_product("Blusa Estampada Mujer T-M",         "7790200001007", "codigo_barras",  9500.0, c["Remeras y Camisas"], empresa_id, stock=22, stock_minimo=4),
        make_product("Polo Piqué Hombre Azul T-L",        "7790200001008", "codigo_barras",  8900.0, c["Remeras y Camisas"], empresa_id, stock=20, stock_minimo=4),

        # ── Pantalones y Jeans ────────────────────────────────────────────
        make_product("Jean Skinny Hombre Azul T-32",      "7790200002001", "codigo_barras", 18500.0, c["Pantalones y Jeans"], empresa_id, stock=15, stock_minimo=3),
        make_product("Jean Skinny Hombre Azul T-34",      "7790200002002", "codigo_barras", 18500.0, c["Pantalones y Jeans"], empresa_id, stock=14, stock_minimo=3),
        make_product("Jean Mom Mujer Negro T-38",          "7790200002003", "codigo_barras", 19800.0, c["Pantalones y Jeans"], empresa_id, stock=12, stock_minimo=3),
        make_product("Jean Mom Mujer Negro T-40",          "7790200002004", "codigo_barras", 19800.0, c["Pantalones y Jeans"], empresa_id, stock=10, stock_minimo=3),
        make_product("Pantalón Chino Hombre Beige T-32",  "7790200002005", "codigo_barras", 15000.0, c["Pantalones y Jeans"], empresa_id, stock=14, stock_minimo=3),
        make_product("Jogger Deportivo Gris T-M",          "7790200002006", "codigo_barras", 11500.0, c["Pantalones y Jeans"], empresa_id, stock=20, stock_minimo=4),

        # ── Vestidos y Faldas ─────────────────────────────────────────────
        make_product("Vestido Casual Floreado T-S",       "7790200003001", "codigo_barras", 16000.0, c["Vestidos y Faldas"], empresa_id, stock=12, stock_minimo=3),
        make_product("Vestido Casual Floreado T-M",       "7790200003002", "codigo_barras", 16000.0, c["Vestidos y Faldas"], empresa_id, stock=11, stock_minimo=3),
        make_product("Vestido Noche Negro T-M",           "7790200003003", "codigo_barras", 28000.0, c["Vestidos y Faldas"], empresa_id, stock=8,  stock_minimo=2),
        make_product("Falda Plisada Blanca T-S",          "7790200003004", "codigo_barras", 11000.0, c["Vestidos y Faldas"], empresa_id, stock=14, stock_minimo=3),
        make_product("Falda Midi Jean T-38",              "7790200003005", "codigo_barras", 13500.0, c["Vestidos y Faldas"], empresa_id, stock=10, stock_minimo=2),

        # ── Ropa de Abrigo ────────────────────────────────────────────────
        make_product("Campera Bomber Negra T-M",          "7790200004001", "codigo_barras", 35000.0, c["Ropa de Abrigo"], empresa_id, stock=10, stock_minimo=2),
        make_product("Campera Bomber Negra T-L",          "7790200004002", "codigo_barras", 35000.0, c["Ropa de Abrigo"], empresa_id, stock=9,  stock_minimo=2),
        make_product("Sweater Lana Hombre Gris T-M",      "7790200004003", "codigo_barras", 22000.0, c["Ropa de Abrigo"], empresa_id, stock=12, stock_minimo=3),
        make_product("Hoodie Canguro Mujer Rosa T-S",     "7790200004004", "codigo_barras", 18000.0, c["Ropa de Abrigo"], empresa_id, stock=15, stock_minimo=3),
        make_product("Buzo Universitario Azul T-M",       "7790200004005", "codigo_barras", 16500.0, c["Ropa de Abrigo"], empresa_id, stock=18, stock_minimo=4),

        # ── Calzado ───────────────────────────────────────────────────────
        make_product("Zapatilla Nike Running N-42",       "7790200005001", "codigo_barras", 62000.0, c["Calzado"], empresa_id, stock=8,  stock_minimo=2),
        make_product("Zapatilla Nike Running N-43",       "7790200005002", "codigo_barras", 62000.0, c["Calzado"], empresa_id, stock=7,  stock_minimo=2),
        make_product("Zapatilla Adidas Mujer N-38",       "7790200005003", "codigo_barras", 58000.0, c["Calzado"], empresa_id, stock=6,  stock_minimo=2),
        make_product("Sandalia Verano Mujer N-37",        "7790200005004", "codigo_barras", 24000.0, c["Calzado"], empresa_id, stock=10, stock_minimo=2),
        make_product("Zapato Hombre Cuero Marrón N-42",   "7790200005005", "codigo_barras", 45000.0, c["Calzado"], empresa_id, stock=7,  stock_minimo=2),
        make_product("Bota Mujer Caña Alta Negra N-38",   "7790200005006", "codigo_barras", 52000.0, c["Calzado"], empresa_id, stock=6,  stock_minimo=2),

        # ── Accesorios ────────────────────────────────────────────────────
        make_product("Cinturón Cuero Hombre Negro",       "7790200006001", "codigo_barras",  8500.0, c["Accesorios"], empresa_id, stock=20, stock_minimo=4),
        make_product("Gorro Lana Gris",                   "7790200006002", "codigo_barras",  5500.0, c["Accesorios"], empresa_id, stock=30, stock_minimo=5),
        make_product("Bufanda Lana Mujer Colorida",       "7790200006003", "codigo_barras",  7200.0, c["Accesorios"], empresa_id, stock=25, stock_minimo=5),
        make_product("Cartera Mujer Beige",               "7790200006004", "codigo_barras", 32000.0, c["Accesorios"], empresa_id, stock=8,  stock_minimo=2),
        make_product("Mochila Urbana Negra",              "7790200006005", "codigo_barras", 25000.0, c["Accesorios"], empresa_id, stock=10, stock_minimo=2),

        # ── Ropa Interior ─────────────────────────────────────────────────
        make_product("Pack 3 Calzoncillos Hombre T-M",   "7790200007001", "codigo_barras",  9800.0, c["Ropa Interior"], empresa_id, stock=25, stock_minimo=5),
        make_product("Pack 3 Calzas Mujer T-S",          "7790200007002", "codigo_barras",  8500.0, c["Ropa Interior"], empresa_id, stock=22, stock_minimo=4),
        make_product("Corpiño Básico Mujer T-90B",        "7790200007003", "codigo_barras",  6200.0, c["Ropa Interior"], empresa_id, stock=18, stock_minimo=4),
        make_product("Pack 6 Medias Hombre",              "7790200007004", "codigo_barras",  5500.0, c["Ropa Interior"], empresa_id, stock=30, stock_minimo=6),
        make_product("Medias Pantufla Mujer Surtidas",    "7790200007005", "codigo_barras",  4200.0, c["Ropa Interior"], empresa_id, stock=28, stock_minimo=5),

        # ── Ropa de Niños ─────────────────────────────────────────────────
        make_product("Conjunto Bebé Body + Pantalón T-3M","7790200008001", "codigo_barras",  8900.0, c["Ropa de Niños"], empresa_id, stock=15, stock_minimo=3),
        make_product("Remera Niño Estampada T-4",         "7790200008002", "codigo_barras",  4200.0, c["Ropa de Niños"], empresa_id, stock=20, stock_minimo=4),
        make_product("Jean Niña Celeste T-6",             "7790200008003", "codigo_barras",  9500.0, c["Ropa de Niños"], empresa_id, stock=12, stock_minimo=3),
        make_product("Pijama Polar Niño T-8",             "7790200008004", "codigo_barras",  9800.0, c["Ropa de Niños"], empresa_id, stock=14, stock_minimo=3),

        # ── Ropa Deportiva ────────────────────────────────────────────────
        make_product("Camiseta Deportiva Hombre T-M",     "7790200009001", "codigo_barras",  7500.0, c["Ropa Deportiva"], empresa_id, stock=20, stock_minimo=4),
        make_product("Calza Deportiva Mujer Negra T-S",   "7790200009002", "codigo_barras",  9800.0, c["Ropa Deportiva"], empresa_id, stock=18, stock_minimo=4),
        make_product("Short Deportivo Hombre T-M",        "7790200009003", "codigo_barras",  7200.0, c["Ropa Deportiva"], empresa_id, stock=22, stock_minimo=4),
        make_product("Conjunto Deportivo Mujer T-M",      "7790200009004", "codigo_barras", 16500.0, c["Ropa Deportiva"], empresa_id, stock=12, stock_minimo=3),
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
            "nombre": "Local Centro",
            "direccion": "Florida 850, CABA",
            "telefono": "+54 11 4325-1122",
            "activo": True,
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": str(uuid.uuid4()),
            "empresa_id": empresa_id,
            "nombre": "Local Recoleta",
            "direccion": "Av. Callao 1100, CABA",
            "telefono": "+54 11 4803-4455",
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
        "receipt_footer_text": "¡Gracias por elegirnos! Cambios con ticket dentro de 30 días.",
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
        "fecha_vencimiento": now + timedelta(days=15),
        "dia_facturacion": None,
        "plan_tipo": "mensual",
        "created_at": now,
    }
    await db.suscripciones.insert_one(suscripcion)
    print("✅ Demo subscription created (TRIAL - 15 days)")


async def seed_proveedores(db, empresa_id):
    print("Creating demo proveedores...")
    if await db.proveedores.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Proveedores already exist")
        return

    proveedores = [
        make_proveedor("Textil Buenos Aires S.A.",   "30-11223344-5", "ventas@textilba.com",      "+54 11 4312-5566", "Av. Avellaneda 1200, Buenos Aires", empresa_id),
        make_proveedor("Distribuidora Moda Sur",     "20-33445566-7", "pedidos@modasur.com",       "+54 11 4891-2233", "Calle Industria 350, Avellaneda",   empresa_id),
        make_proveedor("Importaciones Trend S.R.L.", "30-66778899-0", "importaciones@trend.com",   "+54 11 5215-9900", "Lavalle 200, CABA",                 empresa_id),
        make_proveedor("Calzados del Norte",         "20-44556677-8", "ventas@calzadonorte.com",   "+54 11 4567-3322", "Ruta 9 km 120, Córdoba",            empresa_id),
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
        {"key": "trial_dias",              "value": 15},
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
