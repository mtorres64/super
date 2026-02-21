#!/usr/bin/env python3
"""
Script para inicializar la base de datos con usuarios y datos de prueba.
Uso:
  python init_db.py          # Inicializa solo si las colecciones están vacías
  python init_db.py --reset  # Elimina todos los datos y reinicializa
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.hash import bcrypt
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

# Load environment variables
load_dotenv(backend_path / '.env')


async def create_indexes(db):
    """Crea índices para mejorar el rendimiento de las consultas."""
    print("Creating indexes...")

    # empresas
    await db.empresas.create_index("nombre")

    # users
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("empresa_id", 1), ("rol", 1)])
    await db.users.create_index([("empresa_id", 1), ("branch_id", 1)])

    # products
    await db.products.create_index(
        [("empresa_id", 1), ("codigo_barras", 1)], unique=True, sparse=True
    )
    await db.products.create_index([("empresa_id", 1), ("categoria_id", 1)])
    await db.products.create_index([("empresa_id", 1), ("activo", 1)])

    # categories
    await db.categories.create_index([("empresa_id", 1), ("nombre", 1)], unique=True)

    # branches
    await db.branches.create_index([("empresa_id", 1), ("activo", 1)])

    # branch_products
    await db.branch_products.create_index(
        [("empresa_id", 1), ("product_id", 1), ("branch_id", 1)], unique=True
    )
    await db.branch_products.create_index([("empresa_id", 1), ("branch_id", 1)])

    # sales
    await db.sales.create_index([("empresa_id", 1), ("branch_id", 1), ("fecha", -1)])
    await db.sales.create_index([("empresa_id", 1), ("cajero_id", 1)])
    await db.sales.create_index([("empresa_id", 1), ("session_id", 1)])

    # cash_sessions
    await db.cash_sessions.create_index([("empresa_id", 1), ("user_id", 1), ("status", 1)])
    await db.cash_sessions.create_index([("empresa_id", 1), ("branch_id", 1), ("status", 1)])

    # cash_movements
    await db.cash_movements.create_index([("empresa_id", 1), ("session_id", 1)])

    # configuration
    await db.configuration.create_index("empresa_id", unique=True)

    print("✅ Indexes created successfully")


async def reset_database(db):
    """Elimina todos los datos de la base de datos."""
    collections = [
        "empresas", "users", "categories", "products", "branches",
        "branch_products", "sales", "cash_sessions",
        "cash_movements", "configuration",
    ]
    for col in collections:
        await db[col].delete_many({})
    print("🗑️  Database reset completed")


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
        "password": bcrypt.hash(password),
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
                 stock=50, stock_minimo=10, precio_por_peso=None):
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


async def seed_empresa(db):
    print("Creating demo empresa...")
    existing = await db.empresas.find_one({"nombre": "SuperMarket Demo"})
    if existing:
        print("ℹ️  Demo empresa already exists")
        return existing["id"]

    empresa = make_empresa("SuperMarket Demo")
    await db.empresas.insert_one(empresa)
    print(f"✅ Demo empresa created (id: {empresa['id']})")
    return empresa["id"]


async def seed_users(db, empresa_id):
    print("Creating users...")
    admin_exists = await db.users.find_one({"email": "admin@supermarket.com"})
    if admin_exists:
        print("ℹ️  Users already exist")
        return

    users = [
        make_user("Admin SuperMarket",  "admin@supermarket.com",      "admin123",  "admin",      empresa_id),
        make_user("Carlos Cajero",       "cajero@supermarket.com",     "cajero123", "cajero",     empresa_id),
        make_user("Ana Cajera",          "cajero2@supermarket.com",    "cajero123", "cajero",     empresa_id),
        make_user("Sara Supervisora",    "supervisor@supermarket.com", "super123",  "supervisor", empresa_id),
    ]
    await db.users.insert_many(users)
    print("✅ Users created successfully")


async def seed_categories(db, empresa_id):
    print("Creating categories...")
    if await db.categories.find_one({"empresa_id": empresa_id}):
        print("ℹ️  Categories already exist")
        return

    categories = [
        make_category("Frutas y Verduras", "Productos frescos de temporada",         empresa_id),
        make_category("Lácteos",           "Leche, quesos, yogurt y derivados",       empresa_id),
        make_category("Panadería",         "Pan, pasteles y productos de panadería",  empresa_id),
        make_category("Bebidas",           "Refrescos, jugos, agua y bebidas alcohólicas", empresa_id),
        make_category("Enlatados",         "Conservas y productos enlatados",         empresa_id),
        make_category("Carnes y Embutidos","Res, cerdo, pollo y embutidos",           empresa_id),
        make_category("Higiene Personal",  "Cuidado personal y aseo",                 empresa_id),
        make_category("Limpieza",          "Productos de limpieza del hogar",         empresa_id),
        make_category("Snacks y Golosinas","Botanas, dulces y chocolates",            empresa_id),
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
        # Frutas y Verduras (por_peso)
        make_product("Manzana Red Delicious", "7501234567891", "por_peso", 2.50,
                     c["Frutas y Verduras"], empresa_id, stock=100, stock_minimo=20, precio_por_peso=2.50),
        make_product("Plátano",               "7501234567896", "por_peso", 1.80,
                     c["Frutas y Verduras"], empresa_id, stock=80,  stock_minimo=15, precio_por_peso=1.80),
        make_product("Tomate",                "7501234567920", "por_peso", 1.20,
                     c["Frutas y Verduras"], empresa_id, stock=60,  stock_minimo=12, precio_por_peso=1.20),
        make_product("Cebolla Blanca",        "7501234567921", "por_peso", 0.90,
                     c["Frutas y Verduras"], empresa_id, stock=70,  stock_minimo=15, precio_por_peso=0.90),
        make_product("Papa",                  "7501234567922", "por_peso", 0.65,
                     c["Frutas y Verduras"], empresa_id, stock=120, stock_minimo=25, precio_por_peso=0.65),

        # Lácteos
        make_product("Leche Entera 1L",       "7501234567892", "codigo_barras", 1.25,
                     c["Lácteos"], empresa_id, stock=60, stock_minimo=12),
        make_product("Queso Manchego 250g",   "7501234567897", "codigo_barras", 4.50,
                     c["Lácteos"], empresa_id, stock=30, stock_minimo=6),
        make_product("Yogurt Natural 200g",   "7501234567923", "codigo_barras", 0.95,
                     c["Lácteos"], empresa_id, stock=40, stock_minimo=10),
        make_product("Mantequilla 250g",      "7501234567924", "codigo_barras", 2.80,
                     c["Lácteos"], empresa_id, stock=25, stock_minimo=5),
        make_product("Crema de Leche 500ml",  "7501234567925", "codigo_barras", 1.60,
                     c["Lácteos"], empresa_id, stock=30, stock_minimo=8),

        # Panadería
        make_product("Pan Integral",          "7501234567893", "codigo_barras", 0.75,
                     c["Panadería"], empresa_id, stock=30, stock_minimo=5),
        make_product("Pan Blanco 500g",       "7501234567926", "codigo_barras", 0.65,
                     c["Panadería"], empresa_id, stock=25, stock_minimo=5),
        make_product("Croissant",             "7501234567927", "codigo_barras", 0.45,
                     c["Panadería"], empresa_id, stock=40, stock_minimo=8),

        # Bebidas
        make_product("Coca Cola 500ml",       "7501234567894", "codigo_barras", 1.50,
                     c["Bebidas"], empresa_id, stock=100, stock_minimo=20),
        make_product("Agua Mineral 1L",       "7501234567898", "codigo_barras", 0.85,
                     c["Bebidas"], empresa_id, stock=150, stock_minimo=30),
        make_product("Jugo de Naranja 1L",    "7501234567928", "codigo_barras", 2.10,
                     c["Bebidas"], empresa_id, stock=40,  stock_minimo=10),
        make_product("Cerveza 330ml",         "7501234567929", "codigo_barras", 1.20,
                     c["Bebidas"], empresa_id, stock=80,  stock_minimo=15),

        # Enlatados
        make_product("Atún en Lata 160g",     "7501234567895", "codigo_barras", 2.25,
                     c["Enlatados"], empresa_id, stock=50, stock_minimo=10),
        make_product("Tomate en Lata 400g",   "7501234567930", "codigo_barras", 1.10,
                     c["Enlatados"], empresa_id, stock=45, stock_minimo=8),
        make_product("Frijoles Negros 400g",  "7501234567931", "codigo_barras", 0.95,
                     c["Enlatados"], empresa_id, stock=40, stock_minimo=8),

        # Carnes y Embutidos (por_peso)
        make_product("Pechuga de Pollo",      "7501234567932", "por_peso", 4.20,
                     c["Carnes y Embutidos"], empresa_id, stock=30, stock_minimo=5, precio_por_peso=4.20),
        make_product("Carne Molida de Res",   "7501234567933", "por_peso", 6.50,
                     c["Carnes y Embutidos"], empresa_id, stock=25, stock_minimo=5, precio_por_peso=6.50),
        make_product("Salchicha Frankfurt",   "7501234567934", "codigo_barras", 2.80,
                     c["Carnes y Embutidos"], empresa_id, stock=35, stock_minimo=6),

        # Higiene Personal
        make_product("Shampoo 400ml",         "7501234567935", "codigo_barras", 3.50,
                     c["Higiene Personal"], empresa_id, stock=30, stock_minimo=5),
        make_product("Jabón de Baño",         "7501234567936", "codigo_barras", 0.75,
                     c["Higiene Personal"], empresa_id, stock=60, stock_minimo=10),
        make_product("Pasta Dental 100ml",    "7501234567937", "codigo_barras", 1.90,
                     c["Higiene Personal"], empresa_id, stock=40, stock_minimo=8),

        # Limpieza
        make_product("Detergente 1kg",        "7501234567938", "codigo_barras", 3.20,
                     c["Limpieza"], empresa_id, stock=35, stock_minimo=6),
        make_product("Cloro 1L",              "7501234567939", "codigo_barras", 1.10,
                     c["Limpieza"], empresa_id, stock=40, stock_minimo=8),

        # Snacks y Golosinas
        make_product("Papas Fritas 100g",     "7501234567940", "codigo_barras", 1.25,
                     c["Snacks y Golosinas"], empresa_id, stock=70, stock_minimo=15),
        make_product("Chocolate 50g",         "7501234567941", "codigo_barras", 0.90,
                     c["Snacks y Golosinas"], empresa_id, stock=80, stock_minimo=15),
        make_product("Galletas de Vainilla",  "7501234567942", "codigo_barras", 1.40,
                     c["Snacks y Golosinas"], empresa_id, stock=55, stock_minimo=10),
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
            "nombre": "Sucursal Principal",
            "direccion": "Av. Principal 123",
            "telefono": "+593 99 123 4567",
            "activo": True,
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": str(uuid.uuid4()),
            "empresa_id": empresa_id,
            "nombre": "Sucursal Norte",
            "direccion": "Calle Norte 456",
            "telefono": "+593 99 765 4321",
            "activo": True,
            "created_at": datetime.now(timezone.utc),
        },
    ]
    await db.branches.insert_many(branches)
    print("✅ Branches created successfully")

    # Assign all users of this empresa to the main branch
    main_branch_id = branches[0]["id"]
    await db.users.update_many(
        {"empresa_id": empresa_id},
        {"$set": {"branch_id": main_branch_id}}
    )

    # Create branch_products for every branch × product combination
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
        "company_name": "SuperMarket Demo",
        "company_address": "",
        "company_phone": "",
        "company_email": "",
        "company_tax_id": "",
        "tax_rate": 0.12,
        "currency_symbol": "$",
        "currency_code": "USD",
        "sounds_enabled": True,
        "auto_focus_barcode": True,
        "barcode_scan_timeout": 100,
        "receipt_footer_text": "¡Gracias por su compra!",
        "default_minimum_stock": 10,
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
        empresa_id = await seed_empresa(db)
        await seed_users(db, empresa_id)
        await seed_categories(db, empresa_id)
        await seed_products(db, empresa_id)
        await seed_branches(db, empresa_id)
        await seed_configuration(db, empresa_id)

        print("\n🎉 Database initialization completed!")
    finally:
        client.close()


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    if reset_flag:
        print("⚠️  Reset mode: all existing data will be deleted.")
    asyncio.run(init_database(reset=reset_flag))
